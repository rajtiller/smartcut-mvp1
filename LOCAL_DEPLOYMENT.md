# Local Deployment Guide

## Prerequisites

- Python 3.13+ (or Python 3.11+)
- Node.js 18+
- npm
- FFmpeg (for video processing)

### Install FFmpeg (if not installed)

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

---

## Full Deployment Steps

### 1. Activate Python Virtual Environment

```bash
# Enter project directory
cd smartcut-mvp1

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows
```

After activation, the terminal prompt will show `(venv)`.

### 2. Install Python Dependencies

```bash
# Ensure virtual environment is activated
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Check if `.env` file exists and is configured correctly:

```bash
# If .env does not exist, the start script will create a template
# Edit .env file to ensure it contains your OpenAI API Key
cat .env
```

`.env` file should contain:
```env
OPENAI_API_KEY=your_openai_api_key_here
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

### 4. Create Necessary Directories

```bash
mkdir -p uploads outputs backend/uploads backend/outputs
```

### 5. Start Backend Service

**Method 1: Use Start Script (Recommended)**
```bash
./start_backend.sh
```

**Method 2: Manual Start**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Enter backend directory
cd backend

# Start service
python main.py
```

Backend will start at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/`

### 6. Start Frontend Service (New Terminal Window)

Open a **new terminal window** (keep backend running), run:

```bash
# Enter project directory
cd smartcut-mvp1

# Install frontend dependencies (first time only)
npm install

# Start development server
npm run dev
```

Frontend will start at `http://localhost:5173`

---

## Quick Start (One-Click Script)

### macOS/Linux

Create `start_all.sh`:

```bash
#!/bin/bash

# Start backend (background)
echo "Starting backend service..."
source venv/bin/activate
cd backend
python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend service..."
npm run dev

# Cleanup: Stop backend on Ctrl+C
trap "kill $BACKEND_PID" EXIT
```

Usage:
```bash
chmod +x start_all.sh
./start_all.sh
```

---

## Verify Deployment

1. **Check if Backend is Running**
   - Visit: http://localhost:8000/docs
   - Should see FastAPI Swagger UI

2. **Check if Frontend is Running**
   - Visit: http://localhost:5173
   - Should see application interface

3. **Test Upload Function**
   - Upload a video/audio file on the frontend
   - Check backend logs for processing info

---

## Troubleshooting

### Issue 1: Virtual Environment Not Activated

**Symptom:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue 2: Port Already in Use

**Symptom:** `Address already in use`

**Solution:**
```bash
# Find process using port
lsof -i :8000  # Backend port
lsof -i :5173  # Frontend port

# Kill process
kill -9 <PID>
```

### Issue 3: FFmpeg Not Found

**Symptom:** `ffmpeg.Error` or `FileNotFoundError: ffmpeg`

**Solution:**
```bash
# Check if FFmpeg is installed
ffmpeg -version

# If not installed, install via brew
brew install ffmpeg
```

### Issue 4: OpenAI API Key Error

**Symptom:** `401 Unauthorized` or `Invalid API Key`

**Solution:**
- Check if `OPENAI_API_KEY` in `.env` is correct
- Ensure API Key is valid and has sufficient quota

### Issue 5: CORS Error

**Symptom:** Frontend cannot connect to backend

**Solution:**
- Check if `ALLOWED_ORIGINS` in backend `.env` includes `http://localhost:5173`
- Check if backend is running

---

## Stop Services

1. **Stop Frontend:** Press `Ctrl+C` in the terminal running `npm run dev`
2. **Stop Backend:** Press `Ctrl+C` in the terminal running backend
3. **Exit Virtual Environment:** Run `deactivate`

---

## Development Mode

### Backend Hot Reload

Modify `backend/main.py` startup:

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",  # Use string reference for hot reload
        host="0.0.0.0",
        port=8000,
        reload=True  # Enable hot reload
    )
```

### Frontend Hot Reload

Vite supports hot reload by default. Changes will automatically refresh the browser.

---

## Production Deployment

Production recommendations:
1. Use `gunicorn` or `uvicorn` as WSGI server
2. Use `nginx` as reverse proxy
3. Configure HTTPS
4. Set environment variables instead of using `.env` file
5. Use process manager (like `pm2` or `supervisor`)
