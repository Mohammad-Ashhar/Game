import React, { useEffect, useMemo, useState } from "react";

type ActionParams = { difficulty: number; enemies: number; timeMult: number };
type QRow = { state: string; action: number; actionParams: ActionParams; Q: number; visits?: number };

type Props = {
  userId?: string;               // e.g., email/UUID; default "guest"
  showDemoControls?: boolean;    // show Win/Lose demo buttons
  apiBase?: string;              // override API base if needed
};

const QTablePanel: React.FC<Props> = ({ userId = "guest", showDemoControls = true, apiBase }) => {
  const API = useMemo(
    () => apiBase || (import.meta as any).env?.VITE_Q_API || "http://127.0.0.1:8000",
    [apiBase]
  );

  const [rows, setRows] = useState<QRow[]>([]);
  const [busyDemo, setBusyDemo] = useState(false);     // busy for demo actions
  const [refreshing, setRefreshing] = useState(false); // busy for refresh button
  const [error, setError] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // --- Styles (dark theme) ---
  const card: React.CSSProperties = {
    position: "sticky",
    top: 8,
    zIndex: 9999,
    margin: "12px auto",
    maxWidth: 1200,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #334155",
    background: "rgba(15,23,42,0.95)",
    color: "#e2e8f0",
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
    backdropFilter: "blur(6px)",
  };
  const th = { textAlign: "left" as const, borderBottom: "1px solid #475569", padding: "6px 8px", color: "#f1f5f9" };
  const td = { borderBottom: "1px dashed #334155", padding: "6px 8px", color: "#e2e8f0" };

  // --- Core fetcher with no-cache to avoid stale responses ---
  async function fetchJSON(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers || {});
    headers.set("Cache-Control", "no-store");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    return fetch(url, { ...init, headers });
  }

  // --- Refresh table (now truly re-fetches) ---
  async function refresh() {
    setError("");
    setRefreshing(true);
    try {
      // add a cache-busting query param as an extra guard
      const bust = Date.now();
      const r = await fetchJSON(`${API}/q/table?user=${encodeURIComponent(userId)}&_=${bust}`);
      if (!r.ok) throw new Error(`GET /q/table HTTP ${r.status}`);
      const j = await r.json();
      setRows(Array.isArray(j.rows) ? j.rows : []);
      setLastUpdated(Date.now());
    } catch (e: any) {
      console.error(e);
      setError(String(e?.message || e));
    } finally {
      setRefreshing(false);
    }
  }

  // --- Demo: simulate one step (success => +1, lose => -1) ---
  async function demoStep(success: boolean) {
    setBusyDemo(true);
    setError("");
    try {
      const state = { difficulty: 2, enemies: 1, timeMult: 1, recentSR: success ? 0.7 : 0.3 };

      const chooseRes = await fetchJSON(`${API}/q/choose?user=${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      if (!chooseRes.ok) throw new Error(`POST /q/choose HTTP ${chooseRes.status}`);
      const choose = await chooseRes.json();
      const action: number = choose.action;

      const reward = success ? 1.0 : -1.0;
      const next_state = { ...state, recentSR: success ? 0.75 : 0.25 };

      const updRes = await fetchJSON(`${API}/q/update?user=${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, action, reward, next_state, done: false }),
      });
      if (!updRes.ok) throw new Error(`POST /q/update HTTP ${updRes.status}`);

      await refresh();
    } catch (e: any) {
      console.error(e);
      setError(String(e?.message || e));
    } finally {
      setBusyDemo(false);
    }
  }

  // Reset the table for this user when they log in / change
  useEffect(() => {
    (async () => {
      try {
        await fetchJSON(`${API}/reset?user=${encodeURIComponent(userId)}`, { method: "POST" });
        setRows([]);
        setLastUpdated(Date.now());
      } catch {
        console.warn("Reset failed (backend offline?)");
      }
    })();
  }, [API, userId]);

  // Initial fetch
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, userId]);

  // Keyboard shortcut: press "r" to refresh (without interfering with browser Ctrl+R)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        refresh();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div id="qtable-panel" style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: "#f8fafc" }}>Q-Table (Live)</h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {showDemoControls && (
            <>
              <button
                onClick={() => demoStep(true)}
                disabled={busyDemo || refreshing}
                style={{ background: "#22c55e", color: "white", padding: "6px 12px", border: "none", borderRadius: 6 }}
                title="Simulate a successful level (+1 reward)"
              >
                Demo Win (+1)
              </button>
              <button
                onClick={() => demoStep(false)}
                disabled={busyDemo || refreshing}
                style={{ background: "#ef4444", color: "white", padding: "6px 12px", border: "none", borderRadius: 6 }}
                title="Simulate a failed level (-1 reward)"
              >
                Demo Lose (−1)
              </button>
            </>
          )}
          <button
            onClick={refresh}
            disabled={refreshing || busyDemo}
            style={{ background: "#3b82f6", color: "white", padding: "6px 12px", border: "none", borderRadius: 6, minWidth: 96 }}
            title="Refresh (press 'r')"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            background: "#7f1d1d",
            color: "#fff",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ maxHeight: 360, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={th}>State</th>
              <th style={th}>Action</th>
              <th style={th}>Params</th>
              <th style={{ ...th, textAlign: "right" }}>Q</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r, i) => (
                <tr key={`${r.state}-${r.action}-${i}`}>
                  <td style={td}>{r.state}</td>
                  <td style={td}>{r.action}</td>
                  <td style={td}>
                    d={r.actionParams.difficulty}, e={r.actionParams.enemies}, t={r.actionParams.timeMult}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>{Number(r.Q).toFixed(6)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{ ...td, opacity: 0.8 }} colSpan={4}>
                  No Q-table entries yet (fresh user).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, display: "flex", gap: 12, alignItems: "center" }}>
        <span>
          API: <code style={{ color: "#93c5fd" }}>{API}</code> · User:{" "}
          <code style={{ color: "#fbbf24" }}>{userId}</code>
        </span>
        <span style={{ marginLeft: "auto", opacity: 0.75 }}>
          {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
        </span>
      </div>
    </div>
  );
};

export default QTablePanel;
