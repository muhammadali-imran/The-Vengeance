from __future__ import annotations

import json
import sqlite3
import hashlib
import time
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException
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

DB_PATH = "events.db"

MAX_ACTIONS_PER_HOUR = 30
MAX_CLOCK_SKEW_SECONDS = 5 * 60  # 5 minutes


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


# -----------------------------
# DATABASE INIT
# -----------------------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        peer_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)")
    conn.commit()
    conn.close()


def init_users_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            pubkey_hash TEXT PRIMARY KEY
        )
    """)
    conn.commit()
    conn.close()


init_users_db()


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
    return hashlib.sha256(raw.encode()).hexdigest()


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


# -----------------------------
# APP
# -----------------------------
app = FastAPI(title="Decentralized Truth Node (STRICT + FINALIZATION)")
engine = TrustEngine()


@app.on_event("startup")
def startup():
    init_db()


# -----------------------------
# AUTH ENDPOINTS
# -----------------------------
@app.post("/auth/signup")
def signup(payload: AuthPayload):
    pubkey_hash = derive_pubkey_hash(payload.email, payload.password)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE pubkey_hash = ?", (pubkey_hash,))
    if cur.fetchone():
        conn.close()
        raise HTTPException(409, "User already exists")

    cur.execute(
        "INSERT INTO users (pubkey_hash) VALUES (?)",
        (pubkey_hash,),
    )
    conn.commit()
    conn.close()

    return {"ok": True, "pubkey_hash": pubkey_hash}


@app.post("/auth/login")
def login(payload: AuthPayload):
    pubkey_hash = derive_pubkey_hash(payload.email, payload.password)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM users WHERE pubkey_hash = ?", (pubkey_hash,))
    exists = cur.fetchone() is not None
    conn.close()

    if not exists:
        raise HTTPException(401, "Invalid credentials")

    return {"ok": True, "pubkey_hash": pubkey_hash}


# -----------------------------
# EVENT ENDPOINT
# -----------------------------
@app.post("/event")
def receive_event(e: EventIn):
    server_now = int(time.time())

    validate_event(e)

    # ensure pubkey is registered
    pubkey_hash = e.payload.get("pubkey_hash")
    if pubkey_hash:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM users WHERE pubkey_hash = ?",
            (pubkey_hash,),
        )
        exists = cur.fetchone() is not None
        conn.close()
        if not exists:
            raise HTTPException(401, "Unregistered pubkey")

    if abs(e.timestamp - server_now) > MAX_CLOCK_SKEW_SECONDS:
        raise HTTPException(400, "Event timestamp too far from server time")

    if e.event_type in (RUMOR_VERIFIED, RUMOR_DISPUTED):
        post_id = e.payload.get("rumor_event_id")
        if post_id and is_post_finalized(post_id):
            raise HTTPException(409, "Post is finalized; no further votes allowed")

        rumor_id = e.payload["rumor_event_id"]
        pubkey_hash = e.payload["pubkey_hash"]

        if has_user_voted(rumor_id, pubkey_hash):
            raise HTTPException(409, "User already voted on this rumor")

        verify_pow(
            rumor_id=rumor_id,
            action_type=e.event_type,
            pubkey_hash=pubkey_hash,
            pow_obj=e.payload["pow"],
            now_ts=server_now,
        )

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
