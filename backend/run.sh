#!/bin/bash

# Vets4Claims Backend Startup Script

echo "🇺🇸 Starting Vets4Claims Backend Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check for required environment variables
if [ -z "$GOOGLE_SERVICE_ACCOUNT_FILE" ]; then
    echo "⚠️  Warning: GOOGLE_SERVICE_ACCOUNT_FILE not set"
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  Warning: SUPABASE_URL not set"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not set"
fi

if [ -z "$BASTION_API_KEY" ]; then
    echo "⚠️  Warning: BASTION_API_KEY not set"
fi

# Start the server
echo "🚀 Starting FastAPI server on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8998 --reload