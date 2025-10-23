#!/bin/bash

# Smart Cut Quick Fix Script
# Run this script to fix common transcription issues

echo "🔧 Smart Cut Quick Fix Script"
echo "=============================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Check Python version
python_version=$(python --version 2>&1 | cut -d' ' -f2)
echo "🐍 Python version: $python_version"

# Reinstall dependencies with specific versions
echo "📦 Reinstalling dependencies..."
pip uninstall openai httpx moviepy -y 2>/dev/null || true
pip install openai==1.0.0 httpx==0.24.1 moviepy==1.0.3
pip install -r requirements.txt

# Clear Python cache
echo "🧹 Clearing Python cache..."
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Check .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# File Upload Configuration
MAX_FILE_SIZE=100MB
UPLOAD_DIR=uploads
OUTPUT_DIR=outputs

# CORS Configuration
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
EOF
    echo "⚠️  Please edit .env file and add your OpenAI API key!"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads outputs

# Kill any existing backend processes
echo "🔄 Stopping existing backend processes..."
pkill -f "python backend/main.py" 2>/dev/null || true
sleep 2

# Test OpenAI API
echo "🌐 Testing OpenAI API..."
python -c "
import openai
import os
from dotenv import load_dotenv

load_dotenv()
try:
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    print('✅ OpenAI API client created successfully')
except Exception as e:
    print(f'❌ OpenAI API test failed: {e}')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo "✅ OpenAI API test passed"
else
    echo "❌ OpenAI API test failed"
    echo "Please check your API key in .env file"
    exit 1
fi

# Start backend service
echo "🚀 Starting backend service..."
cd backend
python main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test backend health
echo "🔍 Testing backend health..."
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✅ Backend service is running"
    echo "🌐 Backend URL: http://localhost:8000"
    echo "📖 API Docs: http://localhost:8000/docs"
else
    echo "❌ Backend service failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎉 Quick fix completed!"
echo "=============================="
echo "✅ Virtual environment activated"
echo "✅ Dependencies reinstalled"
echo "✅ Cache cleared"
echo "✅ Backend service running"
echo ""
echo "📋 Next steps:"
echo "1. Make sure your OpenAI API key is set in .env file"
echo "2. Start frontend: npm run dev"
echo "3. Test transcription with a small audio file"
echo ""
echo "🔧 If issues persist, run: python peer_diagnostic.py"
