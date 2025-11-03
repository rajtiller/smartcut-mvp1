#!/bin/bash
# Build script for Render deployment
# This script ensures FFmpeg is available and builds the frontend with correct API URL

echo "Starting build process..."

# Check if FFmpeg is available (should be in Render's environment)
if command -v ffmpeg &> /dev/null; then
    echo "FFmpeg is available"
    ffmpeg -version
else
    echo "Warning: FFmpeg not found. Video processing may fail."
fi

# Build frontend with API URL from environment
if [ -z "$VITE_API_URL" ]; then
    echo "Warning: VITE_API_URL not set. Using default localhost:8000"
    export VITE_API_URL="http://localhost:8000"
fi

echo "Building frontend with API URL: $VITE_API_URL"
npm install
VITE_API_URL=$VITE_API_URL npm run build

echo "Installing serve..."
npm install -g serve

echo "Build complete!"

