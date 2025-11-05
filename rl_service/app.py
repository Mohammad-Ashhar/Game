from flask import Flask, request, jsonify
from flask_cors import CORS
from model import summary_to_feature, probs_from_feature, reward_from_metrics
import random
import os
import json

app = Flask(__name__)
CORS(app)

actions = ['easy', 'medium', 'hard', 'superhard']
STORAGE = 'rl_data.json'
if os.path.exists(STORAGE):
    try:
        with open(STORAGE, 'r') as f:
            saved = json.load(f)
    except Exception:
        saved = {}
else:
    saved = {}

@app.route('/recommend', methods=['POST'])
def recommend():
    summary = request.json or {}
    feat = summary_to_feature(summary)
    probs = probs_from_feature(feat)
    idx = int(random.choices(range(len(actions)), weights=probs, k=1)[0])
    difficulty = actions[idx]
    mapping = {
        'easy': { 'rows': 10, 'cols': 16, 'coinCount': 6, 'obstacleDensity': 0.06, 'difficulty':'easy'},
        'medium': { 'rows': 12, 'cols': 18, 'coinCount': 8, 'obstacleDensity': 0.10, 'difficulty':'medium'},
        'hard': { 'rows': 14, 'cols': 22, 'coinCount': 12, 'obstacleDensity': 0.16, 'difficulty':'hard'},
        'superhard': { 'rows': 16, 'cols': 26, 'coinCount': 18, 'obstacleDensity': 0.22, 'difficulty':'superhard'}
    }
    return jsonify({ 'params': mapping[difficulty], 'probs': probs })

BUFFER = []

@app.route('/update', methods=['POST'])
def update():
    data = request.json or {}
    metrics = data.get('metrics', {})
    r = reward_from_metrics(metrics)
    BUFFER.append(r)
    saved.setdefault('history', []).append({'metrics': metrics, 'reward': r})
    try:
        with open(STORAGE, 'w') as f:
            json.dump(saved, f)
    except Exception:
        pass
    return jsonify({'ok': True})

if __name__ == '__main__':
    app.run(port=5001, debug=False)
