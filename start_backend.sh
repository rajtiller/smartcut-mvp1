#!/bin/bash

# Smart Cut Backend Startup Script

echo "Starting Smart Cut Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run setup first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
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
    echo "Please edit .env file and add your OpenAI API key!"
    echo "Then run this script again."
    exit 1
fi

# Create necessary directories
mkdir -p uploads outputs

# Start the backend server
echo "Starting FastAPI server on http://localhost:8000"
echo "API documentation available at http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server"

cd backend
python main.py
