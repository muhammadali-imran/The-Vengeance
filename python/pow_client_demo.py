import argparse
import hashlib
import json
import time
import uuid
from typing import Dict, Any, Tuple, Optional

import requests


# ---- must match your server ----
POW_BUCKET_SECONDS = 60
DEFAULT_DIFFICULTY = 20


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


def pow_hash(rumor_id: str, action_type: str, pubkey_hash: str, bucket: int, nonce: str) -> str:
    msg = f"{rumor_id}|{action_type}|{pubkey_hash}|{bucket}|{nonce}"
    return hashlib.sha256(msg.encode("utf-8")).hexdigest()


def solve_pow(
    rumor_id: str,
    action_type: str,
    pubkey_hash: str,
    difficulty: int = DEFAULT_DIFFICULTY,
    bucket: Optional[int] = None,
    max_tries: int = 50_000_000,
) -> Dict[str, Any]:
    """
    Brute-force nonce until hash has >= difficulty leading zero bits.
    Returns {"nonce":..., "bucket":..., "difficulty":...}
    """
    if bucket is None:
        bucket = int(time.time()) // POW_BUCKET_SECONDS

    # Use a deterministic-ish prefix for speed / uniqueness
    prefix = uuid.uuid4().hex[:10]

    for i in range(max_tries):
        nonce = f"{prefix}-{i}"
        h = pow_hash(rumor_id, action_type, pubkey_hash, bucket, nonce)
        if leading_zero_bits(h) >= difficulty:
            return {"nonce": nonce, "bucket": bucket, "difficulty": difficulty}

    raise RuntimeError(f"Failed to solve PoW within {max_tries} tries. Lower difficulty.")


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def build_verify_event(
    *,
    rumor_id: str,
    peer_id: str,
    pubkey_hash: str,
    confidence: float,
    difficulty: int,
) -> Dict[str, Any]:
    now_ts = int(time.time())
    action_type = "RUMOR_VERIFIED"
    pow_obj = solve_pow(rumor_id, action_type, pubkey_hash, difficulty=difficulty)

    return {
        "event_type": action_type,
        "payload": {
            "rumor_event_id": rumor_id,
            "confidence": float(confidence),
            "pubkey_hash": pubkey_hash,
            "pow": pow_obj,
        },
        "peer_id": peer_id,
        "timestamp": now_ts,
    }


def build_dispute_event(
    *,
    rumor_id: str,
    peer_id: str,
    pubkey_hash: str,
    confidence: float,
    reason: str,
    difficulty: int,
) -> Dict[str, Any]:
    now_ts = int(time.time())
    action_type = "RUMOR_DISPUTED"
    pow_obj = solve_pow(rumor_id, action_type, pubkey_hash, difficulty=difficulty)

    return {
        "event_type": action_type,
        "payload": {
            "rumor_event_id": rumor_id,
            "confidence": float(confidence),
            "reason": reason,
            "pubkey_hash": pubkey_hash,
            "pow": pow_obj,
        },
        "peer_id": peer_id,
        "timestamp": now_ts,
    }


def post_event(base_url: str, event: Dict[str, Any]) -> Tuple[int, str]:
    url = base_url.rstrip("/") + "/event"
    r = requests.post(url, json=event, timeout=20)
    return r.status_code, r.text


def main():
    ap = argparse.ArgumentParser(description="PoW demo client for STRICT mode verify/dispute.")
    ap.add_argument("--node", default="http://127.0.0.1:7001", help="Truth node base URL (e.g. http://127.0.0.1:7001)")
    ap.add_argument("--peer-id", default="peer-demo", help="peer_id field")
    ap.add_argument("--pubkey", default="demo-key", help="Any string; pubkey_hash = sha256(pubkey)")
    ap.add_argument("--difficulty", type=int, default=DEFAULT_DIFFICULTY, help="PoW difficulty (leading zero bits)")
    ap.add_argument("--rumor-id", required=True, help="event_id of RUMOR_SUBMITTED rumor")
    sub = ap.add_subparsers(dest="cmd", required=True)

    v = sub.add_parser("verify")
    v.add_argument("--confidence", type=float, default=0.9)

    d = sub.add_parser("dispute")
    d.add_argument("--confidence", type=float, default=0.9)
    d.add_argument("--reason", default="I observed conflicting evidence.")

    args = ap.parse_args()

    pubkey_hash = sha256_hex(args.pubkey)

    if args.cmd == "verify":
        event = build_verify_event(
            rumor_id=args.rumor_id,
            peer_id=args.peer_id,
            pubkey_hash=pubkey_hash,
            confidence=args.confidence,
            difficulty=args.difficulty,
        )
    else:
        event = build_dispute_event(
            rumor_id=args.rumor_id,
            peer_id=args.peer_id,
            pubkey_hash=pubkey_hash,
            confidence=args.confidence,
            reason=args.reason,
            difficulty=args.difficulty,
        )

    print("Generated event payload:")
    print(json.dumps(event, indent=2))

    print("\nPosting to truth node...")
    code, text = post_event(args.node, event)
    print("Status:", code)
    print("Response:", text)


if __name__ == "__main__":
    main()
