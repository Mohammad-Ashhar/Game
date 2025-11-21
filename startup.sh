#!/bin/bash

# Exit on error
set -e

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r rl_service/requirements.txt

echo "Installing Node dependencies..."
npm install

echo "Building Vite frontend..."
npm run build

echo "Starting FastAPI with Uvicorn..."
uvicorn rl_service.q_api:app --host 0.0.0.0 --port 8000
