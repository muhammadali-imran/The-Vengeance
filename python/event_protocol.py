from __future__ import annotations

from typing import Dict, Any, List
from fastapi import HTTPException

# ----------------------------
# EVENT TYPES
# ----------------------------
POST_SUBMITTED = "POST_SUBMITTED"
COMMENT_ADDED = "COMMENT_ADDED"

RUMOR_VERIFIED = "RUMOR_VERIFIED"
RUMOR_DISPUTED = "RUMOR_DISPUTED"

RUMOR_RETRACTED = "RUMOR_RETRACTED"
POST_FINALIZED = "POST_FINALIZED"

ALLOWED_EVENT_TYPES = {
    POST_SUBMITTED,
    COMMENT_ADDED,
    RUMOR_VERIFIED,
    RUMOR_DISPUTED,
    RUMOR_RETRACTED,
    POST_FINALIZED,
}


# ----------------------------
# INTERNAL HELPERS
# ----------------------------
def _require(p: Dict[str, Any], keys: List[str], et: str):
    for k in keys:
        if k not in p:
            raise HTTPException(400, f"{et}: missing '{k}'")


# ----------------------------
# MAIN VALIDATOR
# ----------------------------
def validate_event(e):
    et = e.event_type
    p = e.payload or {}

    if et not in ALLOWED_EVENT_TYPES:
        raise HTTPException(400, f"Unknown event_type {et}")

    # =========================================================
    # 🟣 POST SUBMITTED (FINAL VERSION)
    # =========================================================
    if et == POST_SUBMITTED:
        _require(p, ["pubkey_hash", "content"], et)

        content = p.get("content")

        if not isinstance(content, dict):
            raise HTTPException(400, "POST_SUBMITTED: invalid content")

        text = str(content.get("text", "")).strip()
        image = content.get("image")
        video = content.get("video")

        # must contain at least something
        if not text and not image and not video:
            raise HTTPException(400, "POST_SUBMITTED: text or media required")

        # optional type validation
        allowed_types = {"text", "image", "video", "image-text"}
        ctype = content.get("type")
        if ctype and ctype not in allowed_types:
            raise HTTPException(400, f"POST_SUBMITTED: invalid content type '{ctype}'")

    # =========================================================
    # 🟣 COMMENT ADDED
    # =========================================================
    if et == COMMENT_ADDED:
        _require(p, ["pubkey_hash", "post_event_id", "text"], et)

        if not str(p.get("text", "")).strip():
            raise HTTPException(400, "COMMENT_ADDED: empty comment")

    # =========================================================
    # 🟣 VERIFY / DISPUTE
    # =========================================================
    if et in (RUMOR_VERIFIED, RUMOR_DISPUTED):
        _require(p, ["rumor_event_id", "pubkey_hash", "pow"], et)

    # =========================================================
    # 🟣 RETRACT
    # =========================================================
    if et == RUMOR_RETRACTED:
        _require(p, ["rumor_event_id"], et)

    # =========================================================
    # 🟣 FINALIZE
    # =========================================================
    if et == POST_FINALIZED:
        _require(p, ["post_event_id"], et)
        # optional: reason, final_trust
