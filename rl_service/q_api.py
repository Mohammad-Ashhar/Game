from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from pathlib import Path
import os, random

from .q_table import QByteTable, state_key

app = FastAPI(title="Q-Table Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Q_DIR = Path("rl_service/q_tables")
Q_DIR.mkdir(parents=True, exist_ok=True)

def q_path_for_user(user_id: str) -> Path:
    safe = "".join(c for c in (user_id or "guest") if c.isalnum() or c in "-_.@")
    return Q_DIR / f"q_{safe}.json"

_tables: dict[str, QByteTable] = {}

def get_table(user_id: str) -> QByteTable:
    if user_id not in _tables:
        _tables[user_id] = QByteTable(path=q_path_for_user(user_id), alpha=0.4, gamma=0.95, n_actions=15)
    return _tables[user_id]

def reset_table(user_id: str):
    p = q_path_for_user(user_id)
    if p.exists():
        os.remove(p)
    _tables[user_id] = QByteTable(path=p, alpha=0.4, gamma=0.95, n_actions=15)
    print(f"[RESET] Q-table cleared for user={user_id}")

class ChooseIn(BaseModel):
    state: Dict[str, Any]

class UpdateIn(BaseModel):
    state: Dict[str, Any]
    action: int
    reward: float
    next_state: Dict[str, Any]
    done: bool = False

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/reset")
def reset(user: str = Query("guest")):
    reset_table(user)
    return {"ok": True, "user": user}

@app.get("/q/table")
def q_table(user: str = Query("guest")):
    Q = get_table(user)
    return {"rows": Q.rows()}

@app.post("/q/choose")
def q_choose(body: ChooseIn, user: str = Query("guest"), eps: float = Query(0.20, ge=0.0, le=1.0)):
    Q = get_table(user)
    sk = state_key(body.state)
    if random.random() < eps:
        a = random.randrange(Q.n_actions); q = Q.get(sk, a); policy = "random"
    else:
        a, q = Q.best_action(sk); policy = "best"
    print(f"[q_choose] user={user} ({policy}, eps={eps:.2f}) {sk} -> a={a}, q={q:.6f}")
    return {"stateKey": sk, "action": a, "q_value": q, "actionParams": Q.map_action(a), "policy": policy}

@app.post("/q/update")
def q_update(body: UpdateIn, user: str = Query("guest")):
    Q = get_table(user)
    sk = state_key(body.state)
    old_q, new_q, visits = Q.update(body.state, body.action, body.reward, body.next_state, body.done)
    print(f"[q_update] user={user} {sk} a={body.action} r={body.reward} {old_q:.6f}->{new_q:.6f} [visits={visits}]")
    return {"ok": True, "stateKey": sk, "newQ": new_q, "visits": visits}
