# Smart Cut Usage Guide

## 🚀 Quick Start

### 1. Setup Environment Variables
```bash
# Copy environment variable template
cp .env.example .env

# Edit .env file and add your OpenAI API Key
# OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. Start Backend Service
```bash
# Activate virtual environment
source venv/bin/activate

# Start backend
./start_backend.sh
```

### 3. Start Frontend Application
```bash
# In a new terminal window
npm run dev
```

### 4. Test System
```bash
# Test backend API
python test_backend.py
```

## 📋 Usage Steps

1. **Open Application**: Visit http://localhost:5173
2. **Upload File**: Click button to select audio or video file
3. **Wait for Processing**: System will automatically perform speech recognition and silence detection
4. **Select Cuts**: Click on silence segments you want to remove
5. **Confirm Cuts**: Click "Cut X Segments" button
6. **Download Result**: Download the processed file after completion

## 🔧 Troubleshooting

### Backend Won't Start
- Check if Python virtual environment is properly activated
- Confirm all dependencies are installed: `pip install -r requirements.txt`
- Check if port 8000 is already in use

### Frontend Can't Connect to Backend
- Confirm backend service is running at http://localhost:8000
- Check CORS settings are correct
- Check browser console for error messages

### OpenAI API Errors
- Confirm API Key is valid and has sufficient credits
- Check network connection
- Check API usage limits

### File Processing Fails
- Confirm file format is supported (MP3, MP4, WAV, M4A, WebM, OGG, FLAC, AVI, MOV)
- Check if file size is too large
- Ensure sufficient disk space is available

## 📊 API Endpoints

- `GET /` - Health check
- `GET /docs` - API documentation
- `POST /upload` - File upload and transcription
- `POST /detect-silence` - Silence detection
- `POST /cut-video` - Video cutting
- `GET /download/{filename}` - File download

## 🎯 Next Development Steps

- [ ] Add support for more audio formats
- [ ] Implement batch processing
- [ ] Add audio quality optimization
- [ ] Support custom silence thresholds
- [ ] Add progress bar display
- [ ] Implement cloud storage integration
