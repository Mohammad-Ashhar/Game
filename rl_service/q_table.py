from __future__ import annotations
from typing import Dict, Any, Tuple, Optional
from pathlib import Path
import json, time

STATE_FIELDS = ["difficulty", "enemies", "timeMult", "recentSR_bucket"]

def _bucket_sr(sr: Optional[float]) -> int:
    if sr is None:
        return 2
    cuts = [0.2, 0.4, 0.6, 0.8]
    for i, c in enumerate(cuts):
        if sr < c:
            return i
    return 4

def state_key(state: Dict[str, Any]) -> str:
    s = dict(state)
    s["recentSR_bucket"] = _bucket_sr(float(s.get("recentSR", 0.5)))
    return "|".join(f"{k}={int(s.get(k, 0))}" for k in STATE_FIELDS)

class QByteTable:
    """
    Tabular Q-learning store with visit counts, persisted to a FILE PATH
    (one file per user/session).
    """
    def __init__(self, path: Path, alpha=0.4, gamma=0.95, n_actions=15):
        self.path = path
        self.alpha = alpha
        self.gamma = gamma
        self.n_actions = n_actions
        self.Q: Dict[Tuple[str, int], float] = {}
        self.N: Dict[Tuple[str, int], int] = {}
        self._load()

    @staticmethod
    def map_action(a: int) -> Dict[str, int]:
        # 5 difficulties × 3 enemy buckets × 1 timeMult => 15 actions
        d = a // 3
        e = a % 3
        return {"difficulty": d, "enemies": e, "timeMult": 1}

    def get(self, sk: str, a: int) -> float:
        return self.Q.get((sk, a), 0.0)

    def visits(self, sk: str, a: int) -> int:
        return self.N.get((sk, a), 0)

    def best_action(self, sk: str) -> tuple[int, float]:
        best_a, best_q = 0, float("-inf")
        for a in range(self.n_actions):
            q = self.get(sk, a)
            if q > best_q:
                best_a, best_q = a, q
        return best_a, (0.0 if best_q == float("-inf") else best_q)

    def update(self, s: Dict[str, Any], a: int, r: float, sn: Dict[str, Any], done: bool) -> tuple[float, float, int]:
        sk = state_key(s)
        snk = state_key(sn)
        old_q = self.get(sk, a)
        _, max_next = self.best_action(snk)
        target = r + (0.0 if done else self.gamma * max_next)
        new_q = old_q + self.alpha * (target - old_q)
        self.Q[(sk, a)] = float(new_q)
        self.N[(sk, a)] = self.visits(sk, a) + 1
        self._save()
        return old_q, new_q, self.N[(sk, a)]

    def rows(self):
        out = []
        for (sk, a), q in self.Q.items():
            out.append({
                "state": sk,
                "action": a,
                "actionParams": self.map_action(a),
                "Q": q,
                "visits": self.N.get((sk, a), 0),
            })
        return out

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "meta": {"alpha": self.alpha, "gamma": self.gamma, "n_actions": self.n_actions, "ts": time.time()},
            "rows": self.rows(),
        }
        self.path.write_text(json.dumps(data, indent=2))

    def _load(self):
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text())
                self.Q.clear()
                self.N.clear()
                for r in data.get("rows", []):
                    sk = r["state"]
                    a = int(r["action"])
                    self.Q[(sk, a)] = float(r["Q"])
                    self.N[(sk, a)] = int(r.get("visits", 0))
            except Exception:
                self.Q, self.N = {}, {}
