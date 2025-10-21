# Smart Cut MVP1

An AI-powered audio/video auto-editing tool that uses OpenAI Whisper for speech recognition, automatically detects silence segments, and provides interactive editing functionality.

## Features

- 🎵 **Audio/Video Upload**: Supports multiple formats (MP3, MP4, WAV, M4A, WebM, OGG, FLAC, AVI, MOV)
- 🎤 **AI Speech Recognition**: Uses OpenAI Whisper API for high-precision speech-to-text
- 🔇 **Silence Detection**: Automatically identifies silence segments in audio
- ✂️ **Interactive Editing**: Users can select which silence segments to remove
- 📥 **One-Click Download**: Direct download of processed files after completion

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (Build Tool)
- Modern UI Design

### Backend
- Python 3.13
- FastAPI (Web Framework)
- OpenAI Whisper API (Speech Recognition)
- MoviePy (Video Processing)
- Librosa (Audio Analysis)

## Quick Start

### 1. Environment Setup

Make sure your system has:
- Python 3.13+
- Node.js 18+
- npm

### 2. Clone Project

```bash
git clone <your-repo-url>
cd smartcut-mvp1
```

### 3. Setup Python Backend

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env file and add your OpenAI API Key
```

### 4. Start Backend Service

```bash
# Using startup script
./start_backend.sh

# Or manually start
cd backend
python main.py
```

Backend service will start at `http://localhost:8000`

### 5. Start Frontend Application

```bash
# Install frontend dependencies
npm install

# Start development server
npm run dev
```

Frontend application will start at `http://localhost:5173`

## Usage Workflow

1. **Upload File**: Click button to select audio or video file
2. **AI Transcription**: System automatically uses Whisper API for speech recognition
3. **Silence Detection**: Automatically analyzes and identifies silence segments
4. **Select Cuts**: User interactively selects which silence segments to remove
5. **Process & Download**: System edits file and provides download link

## API Endpoints

### POST `/upload`
Upload audio/video file and perform speech recognition

**Parameters**:
- `file`: Audio/video file

**Response**:
```json
{
  "text": "Transcribed text",
  "segments": [...],
  "language": "Detected language"
}
```

### POST `/detect-silence`
Detect silence segments in audio

**Parameters**:
- `file`: Audio/video file
- `threshold`: Silence threshold (default: 0.5)
- `min_duration`: Minimum silence duration (default: 1.0 seconds)

**Response**:
```json
{
  "silence_segments": [
    {
      "start": 10.5,
      "end": 15.2,
      "duration": 4.7,
      "confidence": 0.85
    }
  ]
}
```

### POST `/cut-video`
Cut video/audio based on selected silence segments

**Parameters**:
- `file`: Original file
- `cuts`: List of silence segments to remove (JSON string)

### GET `/download/{filename}`
Download processed file

## Environment Variables

Create `.env` file and configure the following variables:

```env
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
```

## Project Structure

```
smartcut-mvp1/
├── backend/                 # Python Backend
│   └── main.py             # FastAPI Application
├── src/                    # React Frontend
│   ├── App.tsx             # Main Application Component
│   ├── App.css             # Styles
│   └── main.tsx            # Application Entry Point
├── uploads/                # Upload Directory
├── outputs/                # Output Directory
├── requirements.txt        # Python Dependencies
├── package.json            # Node.js Dependencies
├── start_backend.sh        # Backend Startup Script
└── README.md              # Project Documentation
```

## Development Notes

### Adding New Features
1. Backend: Add new API endpoints in `backend/main.py`
2. Frontend: Add corresponding UI components and logic in `src/App.tsx`

### Debugging
- Backend API Documentation: `http://localhost:8000/docs`
- Frontend Development Tools: Browser Developer Tools

## Important Notes

- Requires valid OpenAI API Key
- Large file processing may take time
- Ensure sufficient disk space for temporary files
- Recommended for local network environment

## License

MIT License