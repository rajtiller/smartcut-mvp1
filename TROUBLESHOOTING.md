# Smart Cut Transcription Issues - Troubleshooting Guide

## 🔍 Common Causes of Transcription Failures

### 1. Environment Setup Issues

**Problem**: Virtual environment not activated
```bash
# Solution
source venv/bin/activate
```

**Problem**: Missing dependencies
```bash
# Solution
pip install -r requirements.txt
```

**Problem**: Wrong Python version
```bash
# Check version
python --version
# Should be Python 3.13+
```

### 2. OpenAI API Issues

**Problem**: API Key not set or invalid
```bash
# Check .env file
cat .env
# Should contain: OPENAI_API_KEY=sk-your-actual-key-here
```

**Problem**: API Key has no credits
- Check OpenAI dashboard for usage and billing
- Ensure account has sufficient credits

**Problem**: Network/Firewall blocking OpenAI
```bash
# Test connectivity
curl -I https://api.openai.com/v1/models
```

### 3. Backend Service Issues

**Problem**: Backend not running
```bash
# Start backend
./start_backend.sh
# Or manually
source venv/bin/activate && python backend/main.py
```

**Problem**: Port 8000 already in use
```bash
# Kill existing process
lsof -ti:8000 | xargs kill -9
# Then restart backend
```

**Problem**: CORS issues
- Check if frontend URL is in ALLOWED_ORIGINS in backend

### 4. File Upload Issues

**Problem**: File format not supported
- Supported: MP3, MP4, WAV, M4A, WebM, OGG, FLAC, AVI, MOV
- Check file extension and format

**Problem**: File too large
- Check file size limits in backend
- Consider compressing large files

**Problem**: File permissions
```bash
# Check permissions
ls -la uploads/ outputs/
# Should be writable
```

### 5. Dependency Version Conflicts

**Problem**: OpenAI package version issues
```bash
# Fix OpenAI version
pip uninstall openai -y
pip install openai==1.0.0
```

**Problem**: httpx version conflicts
```bash
# Fix httpx version
pip install httpx==0.24.1
```

**Problem**: MoviePy installation issues
```bash
# Reinstall MoviePy
pip uninstall moviepy -y
pip install moviepy==1.0.3
```

## 🛠️ Step-by-Step Debugging

### Step 1: Run Diagnostic Script
```bash
python peer_diagnostic.py
```

### Step 2: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try uploading a file
4. Look for error messages

### Step 3: Check Backend Logs
```bash
# Start backend in foreground to see logs
source venv/bin/activate && python backend/main.py
```

### Step 4: Test API Directly
```bash
# Test health endpoint
curl http://localhost:8000/

# Test upload endpoint
curl -X POST http://localhost:8000/upload \
  -F "file=@test_audio.wav"
```

## 🔧 Quick Fixes

### Fix 1: Complete Environment Reset
```bash
# Remove virtual environment
rm -rf venv

# Recreate virtual environment
python3 -m venv venv
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Restart services
./start_backend.sh
```

### Fix 2: Clear Cache and Restart
```bash
# Clear Python cache
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +

# Clear browser cache
# Or use incognito/private mode

# Restart everything
pkill -f "python backend/main.py"
./start_backend.sh
```

### Fix 3: Check System Differences
```bash
# Compare Python versions
python --version

# Compare package versions
pip list | grep -E "(openai|fastapi|moviepy|librosa)"

# Compare system info
uname -a
```

## 📋 Peer Machine Checklist

Ask your peer to check:

- [ ] Python 3.13+ installed
- [ ] Virtual environment activated
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] OpenAI API key set in `.env` file
- [ ] Backend service running on port 8000
- [ ] Frontend service running on port 5173
- [ ] Network can reach OpenAI API
- [ ] File permissions allow read/write
- [ ] No firewall blocking localhost:8000
- [ ] Browser console shows no errors

## 🆘 Emergency Solutions

### If Nothing Works
1. **Share your working environment**:
   ```bash
   # Export your environment
   pip freeze > working_requirements.txt
   python --version > python_version.txt
   ```

2. **Use Docker** (if available):
   ```dockerfile
   FROM python:3.13-slim
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["python", "backend/main.py"]
   ```

3. **Remote debugging**:
   - Share screen/terminal access
   - Run diagnostic script together
   - Check logs in real-time

## 📞 Getting Help

If issues persist, provide:
1. Output of `python peer_diagnostic.py`
2. Browser console errors
3. Backend service logs
4. System information (`python --version`, `pip list`)
5. Exact error messages
