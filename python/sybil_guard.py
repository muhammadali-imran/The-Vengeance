from __future__ import annotations

import hashlib
import time
from typing import Any, Dict
from fastapi import HTTPException

POW_DIFFICULTY_DEFAULT = 20
POW_BUCKET_SECONDS = 60


def leading_zero_bits(hex_digest: str) -> int:
    bits = 0
    for ch in hex_digest:
        v = int(ch, 16)
        if v == 0:
            bits += 4
            continue
        if v < 8:
            bits += 1
        if v < 4:
            bits += 1
        if v < 2:
            bits += 1
        return bits
    return bits


def verify_pow(
    *,
    rumor_id: str,
    action_type: str,
    pubkey_hash: str,
    pow_obj: Dict[str, Any],
    now_ts: int,
) -> None:
    """
    STRICT MODE:
    - PoW only required for VERIFY/DISPUTE
    - Bucket is checked against SERVER time (now_ts), not event.timestamp
    """
    try:
        nonce = str(pow_obj["nonce"])
        bucket = int(pow_obj["bucket"])
        difficulty = int(pow_obj.get("difficulty", POW_DIFFICULTY_DEFAULT))
    except Exception:
        raise HTTPException(400, "Invalid pow object")

    now_bucket = now_ts // POW_BUCKET_SECONDS
    if abs(bucket - now_bucket) > 1:
        raise HTTPException(400, "PoW bucket expired")

    msg = f"{rumor_id}|{action_type}|{pubkey_hash}|{bucket}|{nonce}"
    h = hashlib.sha256(msg.encode()).hexdigest()
    if leading_zero_bits(h) < difficulty:
        raise HTTPException(400, "Invalid PoW")
