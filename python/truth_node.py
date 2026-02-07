from __future__ import annotations
import os
import smtplib
from email.message import EmailMessage

import json
import sqlite3
import hashlib
import time
import random
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth_utils import derive_pubkey_hash, validate_nust_email

from event_protocol import (
    validate_event,
    POST_SUBMITTED,
    COMMENT_ADDED,
    RUMOR_VERIFIED,
    RUMOR_DISPUTED,
    RUMOR_RETRACTED,
    POST_FINALIZED,
)

from sybil_guard import verify_pow
from trust_score import TrustEngine, Event as TrustEvent
from dotenv import load_dotenv
load_dotenv()

# -----------------------------
# CONFIG
# -----------------------------
DB_PATH = "events.db"
MAX_ACTIONS_PER_HOUR = 30
MAX_CLOCK_SKEW_SECONDS = 5 * 60  # 5 minutes
OTP_EXPIRY_SECONDS = 300  # 5 minutes

# -----------------------------
# APP
# -----------------------------
app = FastAPI(title="Decentralized Truth Node (STRICT + OTP + FINALIZATION)")
engine = TrustEngine()

# DEV MODE CORS (lock down in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# MODELS
# -----------------------------
class EventIn(BaseModel):
    event_type: str
    payload: Dict[str, Any]
    peer_id: str
    timestamp: int


class AuthPayload(BaseModel):
    email: str
    password: str


class OTPVerifyPayload(BaseModel):
    pubkey_hash: str
    otp: str

class CreatePostPayload(BaseModel):
    pubkey_hash: str
    content: Dict[str, Any]  # {type,text?,image?,video?} base64 dataURL
    peer_id: str = "ui-client"
    timestamp: int | None = None


class CommentPayload(BaseModel):
    pubkey_hash: str
    post_event_id: str
    text: str
    peer_id: str = "ui-client"
    timestamp: int | None = None


class VotePayload(BaseModel):
    pubkey_hash: str
    rumor_event_id: str
    vote: str  # "up" or "down"
    pow: Dict[str, Any]
    peer_id: str = "ui-client"
    timestamp: int | None = None


def ensure_user_exists(pubkey_hash: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE pubkey_hash = ?", (pubkey_hash,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(403, "User not verified")

def _anon_identity(pubkey_hash: str) -> Dict[str, str]:
    short = (pubkey_hash or "anon")[:6]
    return {
        "name": f"Anon {short}",
        "username": f"@anon-{short}",
        "avatar": short[:2].upper(),
    }


def _format_time_ago(ts: int) -> str:
    now = int(time.time())
    diff = max(0, now - int(ts))
    if diff < 60:
        return "Just now"
    if diff < 3600:
        return f"{diff // 60}m ago"
    if diff < 86400:
        return f"{diff // 3600}h ago"
    return f"{diff // 86400}d ago"

# -----------------------------
# DB INIT
# -----------------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Final users table (ONLY after OTP verified)
    # ✅ Add is_verified column because login checks it
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            pubkey_hash TEXT PRIMARY KEY,
            is_verified INTEGER DEFAULT 1
        )
    """)

    # Temporary OTP requests (pre-user)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS otp_requests (
            email TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        )
    """)

    # Events table (unchanged)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            event_type TEXT,
            payload TEXT,
            peer_id TEXT,
            timestamp INTEGER
        )
    """)

    conn.commit()
    conn.close()


@app.on_event("startup")
def startup():
    init_db()


# -----------------------------
# EVENT HELPERS
# -----------------------------
def compute_event_id(e: EventIn) -> str:
    raw = json.dumps(
        {
            "event_type": e.event_type,
            "payload": e.payload,
            "peer_id": e.peer_id,
            "timestamp": e.timestamp,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def store_event(event_id: str, e: EventIn) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT OR IGNORE INTO events VALUES (?,?,?,?,?)",
        (
            event_id,
            e.event_type,
            json.dumps(e.payload, sort_keys=True, separators=(",", ":")),
            e.peer_id,
            e.timestamp,
        ),
    )
    conn.commit()
    stored = (cur.rowcount == 1)
    conn.close()
    return stored


def load_events() -> List[TrustEvent]:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT event_id,event_type,payload,peer_id,timestamp FROM events ORDER BY timestamp ASC"
    ).fetchall()
    conn.close()

    out: List[TrustEvent] = []
    for r in rows:
        out.append(
            TrustEvent(
                event_id=r[0],
                event_type=r[1],
                payload=json.loads(r[2]),
                peer_id=r[3],
                timestamp=r[4],
            )
        )
    return out


def has_user_voted(rumor_id: str, pubkey_hash: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT 1 FROM events
        WHERE event_type IN ('RUMOR_VERIFIED','RUMOR_DISPUTED')
          AND json_extract(payload, '$.rumor_event_id') = ?
          AND json_extract(payload, '$.pubkey_hash') = ?
        LIMIT 1
        """,
        (rumor_id, pubkey_hash),
    ).fetchall()
    conn.close()
    return len(rows) > 0


def count_recent_actions(pubkey_hash: str, now_ts: int) -> int:
    hour_ago = now_ts - 3600
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT payload FROM events WHERE timestamp >= ?",
        (hour_ago,),
    ).fetchall()
    conn.close()

    count = 0
    for (payload_json,) in rows:
        try:
            p = json.loads(payload_json)
        except Exception:
            continue
        if p.get("pubkey_hash") == pubkey_hash:
            count += 1
    return count


def is_post_finalized(post_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT 1 FROM events
        WHERE event_type = ?
          AND json_extract(payload, '$.post_event_id') = ?
        LIMIT 1
        """,
        (POST_FINALIZED, post_id),
    ).fetchall()
    conn.close()
    return len(rows) > 0


def ensure_pubkey_verified(pubkey_hash: str) -> None:
    """
    Require OTP verification for actions that use pubkey_hash.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT is_verified FROM users WHERE pubkey_hash = ?", (pubkey_hash,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(401, "Unregistered pubkey")

    if int(row[0]) == 0:
        raise HTTPException(403, "Email not verified")


# -----------------------------
# OTP HELPERS
# -----------------------------
def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def send_otp_email(email: str, otp: str):
    sender = os.getenv("EMAIL_SENDER")
    password = os.getenv("EMAIL_PASSWORD")

    if not sender or not password:
        raise HTTPException(
            status_code=500,
            detail="Email credentials not configured in environment variables"
        )

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = email
    msg["Subject"] = "Your OTP Verification Code"

    msg.set_content(
        f"""
Hello,

Your One-Time Password (OTP) is:

🔐 {otp}

This code will expire in 5 minutes.

If you did not request this verification, please ignore this email.

— Decentralized Truth System
"""
    )

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender, password)
            server.send_message(msg)

        print(f"[EMAIL SENT] OTP sent to {email}")

    except Exception as e:
        print("[EMAIL ERROR]", e)
        raise HTTPException(500, "Failed to send OTP email")


# -----------------------------
# AUTH
# -----------------------------
@app.post("/auth/signup")
def signup(payload: AuthPayload):
    if not validate_nust_email(payload.email):
        raise HTTPException(400, "Invalid university email")

    # ✅ derive pubkey_hash so frontend can store it for OTP verify
    pubkey_hash = derive_pubkey_hash(payload.email, payload.password)

    otp = generate_otp()
    otp_hash = hash_value(otp)
    password_hash = hash_value(payload.password)
    expires = int(time.time()) + OTP_EXPIRY_SECONDS

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Store ONLY a temporary OTP request
    cur.execute("""
        INSERT OR REPLACE INTO otp_requests
        (email, password_hash, otp_hash, expires_at)
        VALUES (?, ?, ?, ?)
    """, (payload.email, password_hash, otp_hash, expires))

    conn.commit()
    conn.close()

    send_otp_email(payload.email, otp)

    return {
        "ok": True,
        "pubkey_hash": pubkey_hash,
        "message": "OTP sent to email"
    }

@app.post("/auth/verify-otp")
def verify_otp(payload: OTPVerifyPayload):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # ✅ Fetch all pending OTP requests (because we don't store pubkey_hash in otp_requests)
    rows = cur.execute(
        "SELECT email, otp_hash, expires_at FROM otp_requests"
    ).fetchall()

    if not rows:
        conn.close()
        raise HTTPException(404, "No OTP request found")

    # ✅ Find matching OTP
    found = None
    for email, otp_hash_db, expires_at in rows:
        if hash_value(payload.otp) == otp_hash_db:
            found = (email, otp_hash_db, expires_at)
            break

    if not found:
        conn.close()
        raise HTTPException(400, "Invalid OTP")

    email, otp_hash_db, expires_at = found

    if time.time() > expires_at:
        conn.close()
        raise HTTPException(400, "OTP expired")

    # ✅ OTP verified → create user
    cur.execute(
        "INSERT OR IGNORE INTO users (pubkey_hash, is_verified) VALUES (?, 1)",
        (payload.pubkey_hash,)
    )

    # cleanup OTP request
    cur.execute("DELETE FROM otp_requests WHERE email = ?", (email,))

    conn.commit()
    conn.close()

    return {"ok": True, "verified": True}


@app.post("/auth/login")
def login(payload: AuthPayload):
    pubkey_hash = derive_pubkey_hash(payload.email, payload.password)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT is_verified FROM users WHERE pubkey_hash = ?",
        (pubkey_hash,)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(401, "Invalid credentials")

    if int(row[0]) == 0:
        raise HTTPException(403, "Email not verified")

    return {"ok": True, "pubkey_hash": pubkey_hash}


# -----------------------------
# EVENT ENDPOINT
# -----------------------------
@app.post("/event")
def receive_event(e: EventIn):
    server_now = int(time.time())

    validate_event(e)

    if abs(int(e.timestamp) - server_now) > MAX_CLOCK_SKEW_SECONDS:
        raise HTTPException(400, "Event timestamp too far from server time")

    # If event includes pubkey_hash, enforce it exists and is verified
    pubkey_hash = e.payload.get("pubkey_hash")
    if pubkey_hash:
        ensure_pubkey_verified(pubkey_hash)

    # STRICT MODE checks for verify/dispute
    if e.event_type in (RUMOR_VERIFIED, RUMOR_DISPUTED):
        post_id = e.payload.get("rumor_event_id")
        if post_id and is_post_finalized(post_id):
            raise HTTPException(409, "Post is finalized; no further votes allowed")

        rumor_id = e.payload.get("rumor_event_id")
        if not rumor_id:
            raise HTTPException(400, "Missing rumor_event_id")

        pubkey_hash = e.payload.get("pubkey_hash")
        if not pubkey_hash:
            raise HTTPException(400, "Missing pubkey_hash")

        # one vote per rumor per pubkey_hash
        if has_user_voted(rumor_id, pubkey_hash):
            raise HTTPException(409, "User already voted on this rumor")

        # PoW required for verify/dispute only (STRICT MODE)
        if "pow" not in e.payload:
            raise HTTPException(400, "Missing PoW")

        verify_pow(
            rumor_id=rumor_id,
            action_type=e.event_type,
            pubkey_hash=pubkey_hash,
            pow_obj=e.payload["pow"],
            now_ts=server_now,
        )

        # rate limiting
        if count_recent_actions(pubkey_hash, server_now) >= MAX_ACTIONS_PER_HOUR:
            raise HTTPException(429, "Rate limit exceeded")

    event_id = compute_event_id(e)
    stored = store_event(event_id, e)

    return {"ok": True, "event_id": event_id, "stored": stored}


# -----------------------------
# READ EVENTS
# -----------------------------
@app.get("/events")
def list_events():
    return load_events()


# -----------------------------
# FINALIZATION
# -----------------------------
@app.post("/finalize/{post_id}")
def finalize_post(post_id: str):
    if is_post_finalized(post_id):
        return {"ok": True, "already_finalized": True}

    events = load_events()
    trust = engine.trust_with_children(events, post_id)

    e = EventIn(
        event_type=POST_FINALIZED,
        payload={
            "post_event_id": post_id,
            "final_trust": trust,
            "reason": "trust stabilized",
        },
        peer_id="protocol-rule",
        timestamp=int(time.time()),
    )

    event_id = compute_event_id(e)
    stored = store_event(event_id, e)

    return {
        "ok": True,
        "event_id": event_id,
        "final_trust": trust,
        "stored": stored,
    }

@app.post("/create-post")
def create_post(p: CreatePostPayload):
    ensure_pubkey_verified(p.pubkey_hash)

    ts = int(p.timestamp or time.time())

    # Build event
    e = EventIn(
        event_type=POST_SUBMITTED,
        payload={
            "pubkey_hash": p.pubkey_hash,
            "content": p.content,  # base64 dataURL allowed
        },
        peer_id=p.peer_id,
        timestamp=ts,
    )

    # optional protocol validation if your event_protocol is strict
    validate_event(e)

    event_id = compute_event_id(e)
    stored = store_event(event_id, e)

    return {"ok": True, "post_event_id": event_id, "stored": stored}

@app.post("/comment")
def add_comment(p: CommentPayload):
    ensure_pubkey_verified(p.pubkey_hash)

    ts = int(p.timestamp or time.time())

    e = EventIn(
        event_type=COMMENT_ADDED,
        payload={
            "pubkey_hash": p.pubkey_hash,
            "post_event_id": p.post_event_id,
            "text": p.text.strip(),
        },
        peer_id=p.peer_id,
        timestamp=ts,
    )

    validate_event(e)

    event_id = compute_event_id(e)
    stored = store_event(event_id, e)

    return {"ok": True, "comment_event_id": event_id, "stored": stored}

@app.post("/vote")
def vote(p: VotePayload):
    ensure_pubkey_verified(p.pubkey_hash)

    ts = int(p.timestamp or time.time())
    server_now = int(time.time())

    if p.vote not in ("up", "down"):
        raise HTTPException(400, "vote must be 'up' or 'down'")

    event_type = RUMOR_VERIFIED if p.vote == "up" else RUMOR_DISPUTED

    # STRICT checks (same as /event)
    if is_post_finalized(p.rumor_event_id):
        raise HTTPException(409, "Post is finalized; no further votes allowed")

    if has_user_voted(p.rumor_event_id, p.pubkey_hash):
        raise HTTPException(409, "User already voted on this rumor")

    verify_pow(
        rumor_id=p.rumor_event_id,
        action_type=event_type,
        pubkey_hash=p.pubkey_hash,
        pow_obj=p.pow,
        now_ts=server_now,
    )

    if count_recent_actions(p.pubkey_hash, server_now) >= MAX_ACTIONS_PER_HOUR:
        raise HTTPException(429, "Rate limit exceeded")

    e = EventIn(
        event_type=event_type,
        payload={
            "rumor_event_id": p.rumor_event_id,
            "pubkey_hash": p.pubkey_hash,
            "pow": p.pow,
        },
        peer_id=p.peer_id,
        timestamp=ts,
    )

    validate_event(e)

    event_id = compute_event_id(e)
    stored = store_event(event_id, e)

    return {"ok": True, "vote_event_id": event_id, "stored": stored}

@app.get("/feed")
def get_feed():
    events = load_events()

    posts = []
    for ev in events:
        if ev.event_type != POST_SUBMITTED:
            continue

        post_id = ev.event_id
        content = ev.payload.get("content", {})
        author = _anon_identity(ev.payload.get("pubkey_hash", ""))

        # counts
        up = 0
        down = 0
        comment_count = 0

        for e2 in events:
            if e2.event_type == COMMENT_ADDED and e2.payload.get("post_event_id") == post_id:
                comment_count += 1
            if e2.event_type == RUMOR_VERIFIED and e2.payload.get("rumor_event_id") == post_id:
                up += 1
            if e2.event_type == RUMOR_DISPUTED and e2.payload.get("rumor_event_id") == post_id:
                down += 1

        trust = engine.trust_with_children(events, post_id)

        posts.append({
            "id": post_id,
            "author": author,
            "content": content,
            "upvotes": up,
            "downvotes": down,
            "comments": comment_count,
            "trust": trust,
            "timestamp": _format_time_ago(ev.timestamp),
            "created_ts": ev.timestamp,
        })

    # newest first
    posts.sort(key=lambda x: x["created_ts"], reverse=True)
    return posts

@app.get("/post/{post_id}")
def get_post(post_id: str):
    events = load_events()

    post_ev = None
    for ev in events:
        if ev.event_id == post_id and ev.event_type == POST_SUBMITTED:
            post_ev = ev
            break

    if not post_ev:
        raise HTTPException(404, "Post not found")

    author = _anon_identity(post_ev.payload.get("pubkey_hash", ""))
    content = post_ev.payload.get("content", {})

    up = 0
    down = 0
    comments = []

    for e2 in events:
        if e2.event_type == RUMOR_VERIFIED and e2.payload.get("rumor_event_id") == post_id:
            up += 1
        if e2.event_type == RUMOR_DISPUTED and e2.payload.get("rumor_event_id") == post_id:
            down += 1
        if e2.event_type == COMMENT_ADDED and e2.payload.get("post_event_id") == post_id:
            a = _anon_identity(e2.payload.get("pubkey_hash", ""))
            comments.append({
                "id": e2.event_id,
                "author": a["name"],
                "avatar": a["avatar"],
                "text": e2.payload.get("text", ""),
                "timestamp": _format_time_ago(e2.timestamp),
            })

    comments.sort(key=lambda x: x["timestamp"])  # simple

    trust = engine.trust_with_children(events, post_id)

    return {
        "id": post_id,
        "author": author,
        "content": content,
        "upvotes": up,
        "downvotes": down,
        "comments": comments,
        "trust": trust,
        "timestamp": _format_time_ago(post_ev.timestamp),
    }



