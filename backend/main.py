import os
import tempfile
import shutil
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import openai
from moviepy.editor import VideoFileClip, AudioFileClip
import librosa
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Smart Cut API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

# Pydantic models
class TranscriptionSegment(BaseModel):
    id: int
    seek: float
    start: float
    end: float
    text: str
    tokens: List[int]
    temperature: float
    avg_logprob: float
    compression_ratio: float
    no_speech_prob: float

class TranscriptionResult(BaseModel):
    text: str
    segments: List[TranscriptionSegment]
    language: str

class SilenceSegment(BaseModel):
    start: float
    end: float
    duration: float
    confidence: float

class CutRequest(BaseModel):
    silence_segments: List[SilenceSegment]

@app.get("/")
async def root():
    return {"message": "Smart Cut API is running!"}

@app.post("/upload", response_model=TranscriptionResult)
async def upload_and_transcribe(file: UploadFile = File(...)):
    """Upload audio/video file and transcribe using OpenAI Whisper"""
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file type
    allowed_extensions = {'.mp3', '.mp4', '.wav', '.m4a', '.webm', '.ogg', '.flac', '.avi', '.mov'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_ext}. Allowed: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Transcribe using OpenAI Whisper
        with open(file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json"
            )
        
        # Convert to our model format
        segments = [
            TranscriptionSegment(
                id=seg["id"],
                seek=seg["seek"],
                start=seg["start"],
                end=seg["end"],
                text=seg["text"],
                tokens=seg["tokens"],
                temperature=seg["temperature"],
                avg_logprob=seg["avg_logprob"],
                compression_ratio=seg["compression_ratio"],
                no_speech_prob=seg["no_speech_prob"]
            )
            for seg in transcript.segments
        ]
        
        result = TranscriptionResult(
            text=transcript.text,
            segments=segments,
            language=transcript.language
        )
        
        return result
        
    except Exception as e:
        print(f"Transcription error: {str(e)}")  # 添加详细日志
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up uploaded file
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)

@app.post("/detect-silence")
async def detect_silence(
    file: UploadFile = File(...),
    threshold: float = Form(0.5),
    min_duration: float = Form(1.0)
):
    """Detect silence segments in audio/video file"""
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract audio from file
        if file_path.lower().endswith(('.mp4', '.avi', '.mov', '.webm')):
            # Video file - extract audio
            video = VideoFileClip(file_path)
            audio = video.audio
            audio_path = f"uploads/temp_audio_{file.filename}.wav"
            audio.write_audiofile(audio_path, verbose=False, logger=None)
            video.close()
            audio.close()
        else:
            # Audio file
            audio_path = file_path
        
        # Load audio with librosa
        y, sr = librosa.load(audio_path, sr=None)
        
        # Detect silence using librosa
        intervals = librosa.effects.split(y, top_db=20, frame_length=2048, hop_length=512)
        
        silence_segments = []
        for start_frame, end_frame in intervals:
            start_time = start_frame / sr
            end_time = end_frame / sr
            duration = end_time - start_time
            
            if duration >= min_duration:
                # Calculate confidence based on silence duration
                confidence = min(1.0, duration / 5.0)  # Max confidence at 5 seconds
                
                silence_segments.append(SilenceSegment(
                    start=start_time,
                    end=end_time,
                    duration=duration,
                    confidence=confidence
                ))
        
        # Clean up temporary files
        if os.path.exists(audio_path) and audio_path != file_path:
            os.remove(audio_path)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {"silence_segments": silence_segments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silence detection failed: {str(e)}")

@app.post("/cut-video")
async def cut_video(
    file: UploadFile = File(...),
    cuts: str = Form(...)  # JSON string of cuts to make
):
    """Cut video/audio based on silence segments"""
    
    import json
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        # Parse cuts
        cuts_data = json.loads(cuts)
        
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Determine if it's video or audio
        is_video = file_path.lower().endswith(('.mp4', '.avi', '.mov', '.webm'))
        
        if is_video:
            # Process video
            clip = VideoFileClip(file_path)
            
            # Create segments to keep (inverse of cuts)
            segments_to_keep = []
            current_time = 0
            
            for cut in cuts_data:
                if current_time < cut["start"]:
                    segments_to_keep.append((current_time, cut["start"]))
                current_time = cut["end"]
            
            # Add final segment if needed
            if current_time < clip.duration:
                segments_to_keep.append((current_time, clip.duration))
            
            # Concatenate segments
            if segments_to_keep:
                final_clips = [clip.subclip(start, end) for start, end in segments_to_keep]
                final_video = VideoFileClip.concatenate_videoclips(final_clips)
            else:
                final_video = clip
            
            # Save output
            output_path = f"outputs/cut_{file.filename}"
            final_video.write_videofile(output_path, verbose=False, logger=None)
            
            # Clean up
            clip.close()
            final_video.close()
            
        else:
            # Process audio
            clip = AudioFileClip(file_path)
            
            # Create segments to keep (inverse of cuts)
            segments_to_keep = []
            current_time = 0
            
            for cut in cuts_data:
                if current_time < cut["start"]:
                    segments_to_keep.append((current_time, cut["start"]))
                current_time = cut["end"]
            
            # Add final segment if needed
            if current_time < clip.duration:
                segments_to_keep.append((current_time, clip.duration))
            
            # Concatenate segments
            if segments_to_keep:
                final_clips = [clip.subclip(start, end) for start, end in segments_to_keep]
                final_audio = AudioFileClip.concatenate_audioclips(final_clips)
            else:
                final_audio = clip
            
            # Save output
            output_path = f"outputs/cut_{file.filename}"
            final_audio.write_audiofile(output_path, verbose=False, logger=None)
            
            # Clean up
            clip.close()
            final_audio.close()
        
        # Clean up input file
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {"output_file": output_path, "message": "Video cut successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video cutting failed: {str(e)}")

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download processed file"""
    
    file_path = f"outputs/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
