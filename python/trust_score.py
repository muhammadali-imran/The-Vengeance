from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


POST_FINALIZED = "POST_FINALIZED"
RUMOR_VERIFIED = "RUMOR_VERIFIED"
RUMOR_DISPUTED = "RUMOR_DISPUTED"
COMMENT_ADDED = "COMMENT_ADDED"


EVIDENCE_WEIGHTS = {
    "image": 1.3,
    "video": 1.6,
    "document": 1.2,
    "pdf": 1.2,
}

MAX_EVIDENCE_MULTIPLIER = 2.0


@dataclass(frozen=True)
class Event:
    event_id: str
    event_type: str
    payload: Dict[str, Any]
    peer_id: str
    timestamp: int


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


class TrustEngine:
    def __init__(
        self,
        alpha: float = 1.0,
        beta: float = 1.0,
        base_peer_weight: float = 0.5,
        propagation_lambda: float = 0.35,
    ):
        self.alpha = alpha
        self.beta = beta
        self.base_peer_weight = base_peer_weight
        self.lambda_ = propagation_lambda

    # ----------------------------
    # Evidence weighting
    # ----------------------------

    def evidence_multiplier(self, payload: Dict[str, Any]) -> float:
        evidence = payload.get("evidence")
        if not evidence:
            return 1.0

        weights = []
        for e in evidence:
            t = e.get("type")
            if t in EVIDENCE_WEIGHTS:
                weights.append(EVIDENCE_WEIGHTS[t])

        if not weights:
            return 1.0

        avg = sum(weights) / len(weights)
        return min(MAX_EVIDENCE_MULTIPLIER, avg)

    # ----------------------------
    # Base trust (no propagation)
    # ----------------------------

    def base_trust(self, events: List[Event], node_id: str) -> float:
        # finalized snapshot?
        snap = self._finalized_snapshot(events, node_id)
        if snap is not None:
            return snap

        pos = 0.0
        neg = 0.0

        for e in events:
            if e.payload.get("rumor_event_id") != node_id:
                continue

            mult = self.evidence_multiplier(e.payload)
            conf = float(e.payload.get("confidence", 1.0))

            if e.event_type == RUMOR_VERIFIED:
                pos += mult * conf
            elif e.event_type == RUMOR_DISPUTED:
                neg += mult * conf

        raw = self.alpha * math.log1p(pos) - self.beta * math.log1p(neg)
        return sigmoid(raw)

    # ----------------------------
    # Trust propagation
    # ----------------------------

    def trust_with_children(self, events: List[Event], node_id: str) -> float:
        base = self.base_trust(events, node_id)

        children = [
            e.event_id
            for e in events
            if e.event_type == COMMENT_ADDED
            and e.payload.get("parent_id") == node_id
        ]

        if not children:
            return base

        deltas = []
        for cid in children:
            ct = self.base_trust(events, cid)
            deltas.append(ct - 0.5)

        influence = self.lambda_ * (sum(deltas) / len(deltas))
        return clamp01(base + influence)

    # ----------------------------
    # Finalization snapshot
    # ----------------------------

    def _finalized_snapshot(self, events: List[Event], node_id: str) -> Optional[float]:
        for e in events:
            if e.event_type == POST_FINALIZED and e.payload.get("post_event_id") == node_id:
                return float(e.payload.get("final_trust", 0.5))
        return None
