import math

def summary_to_feature(summary, max_len=10):
    last = summary.get('lastPlays', [])[-max_len:]
    feat = []
    for p in last:
        m = p.get('metrics', {})
        feat += [1.0 if m.get('finished') else 0.0,
                 (m.get('coinsCollected', 0) / max(1, m.get('totalCoins', 1))),
                 min(1.0, 1.0 / (1.0 + m.get('timeTaken', 0)))]
    feat = feat + [0.0] * (max(0, 10 - len(feat)))
    return feat[:10]

DEFAULT_PROBS = [0.5, 0.3, 0.15, 0.05]

def probs_from_feature(feat):
    if not feat:
        return DEFAULT_PROBS[:]
    n = len(feat) // 3
    if n == 0:
        return DEFAULT_PROBS[:]
    finished = 0.0; coins = 0.0; speed = 0.0
    for i in range(n):
        finished += feat[i*3 + 0]
        coins += feat[i*3 + 1]
        speed += feat[i*3 + 2]
    finished /= n; coins /= n; speed /= n
    score = 0.5*finished + 0.3*coins + 0.2*speed  # range ~0..1
    # Map score to distribution
    if score < 0.3:
        return [0.8, 0.15, 0.04, 0.01]
    elif score < 0.6:
        return [0.4, 0.4, 0.15, 0.05]
    elif score < 0.85:
        return [0.15, 0.5, 0.25, 0.10]
    else:
        return [0.05, 0.25, 0.45, 0.25]

def reward_from_metrics(metrics):
    if not metrics:
        return 0.0
    return 1.0 if metrics.get('finished') else (metrics.get('coinsCollected',0) / max(1, metrics.get('totalCoins',1)))
