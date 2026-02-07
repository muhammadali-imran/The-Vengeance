from __future__ import annotations

from typing import Dict, Any, List
from fastapi import HTTPException

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


def _require(p: Dict[str, Any], keys: List[str], et: str):
    for k in keys:
        if k not in p:
            raise HTTPException(400, f"{et}: missing '{k}'")


def validate_event(e):
    et = e.event_type
    p = e.payload or {}

    if et not in ALLOWED_EVENT_TYPES:
        raise HTTPException(400, f"Unknown event_type {et}")

    if et == POST_SUBMITTED:
        _require(p, ["text", "topic"], et)
        if not str(p["text"]).strip():
            raise HTTPException(400, "POST_SUBMITTED: text empty")
        if not str(p["topic"]).strip():
            raise HTTPException(400, "POST_SUBMITTED: topic empty")

    if et == COMMENT_ADDED:
        _require(p, ["root_id", "parent_id"], et)
        if not p.get("text") and not p.get("attachments"):
            raise HTTPException(400, "COMMENT_ADDED: text or attachment required")

    if et in (RUMOR_VERIFIED, RUMOR_DISPUTED):
        _require(p, ["rumor_event_id", "pubkey_hash", "pow"], et)

    if et == RUMOR_RETRACTED:
        _require(p, ["rumor_event_id"], et)

    if et == POST_FINALIZED:
        _require(p, ["post_event_id"], et)
        # optional fields: reason, method, threshold
