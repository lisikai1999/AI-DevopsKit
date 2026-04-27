#!/bin/bash

# AI-DevopsKit Backend Startup Script
# Usage: ./run.sh [--init] [--dev]

VENV_PATH="/root/python3/venv"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================="
echo "  AI-DevopsKit Backend"
echo "=============================================="

# Source the virtual environment
if [ -d "$VENV_PATH" ]; then
    echo "Activating virtual environment: $VENV_PATH"
    source "$VENV_PATH/bin/activate"
else
    echo "WARNING: Virtual environment not found at $VENV_PATH"
    echo "Using system Python instead..."
fi

cd "$BACKEND_DIR"

# Check command line arguments
if [ "$1" = "--init" ] || [ "$2" = "--init" ]; then
    echo ""
    echo "Initializing database..."
    python init_db.py
    echo "Database initialization complete!"
fi

# Determine host and port
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-9000}"
RELOAD=""

if [ "$1" = "--dev" ] || [ "$2" = "--dev" ]; then
    RELOAD="--reload"
    echo "Running in development mode (with auto-reload)"
fi

echo ""
echo "Starting backend server..."
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  API docs: http://$HOST:$PORT/docs"
echo "  Health check: http://$HOST:$PORT/health"
echo ""

python -m uvicorn app.main:app --host "$HOST" --port "$PORT" $RELOAD
