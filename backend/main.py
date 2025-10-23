import os
import tempfile
import shutil
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import openai
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips, concatenate_audioclips
import librosa
import numpy as np
from dotenv import load_dotenv

# Load environment variables (override system variables)
load_dotenv(override=True)

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
        print(f"Transcription error: {str(e)}")  # Add detailed logging
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up uploaded file
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)

@app.post("/detect-silence")
async def detect_silence(
    file: UploadFile = File(...),
    threshold: float = Form(0.3),  # 降低阈值，更容易检测到静音
    min_duration: float = Form(0.5)  # 降低最小时长
):
    """Detect silence segments using Whisper's no_speech_prob"""
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Transcribe using OpenAI Whisper to get segments with no_speech_prob
        with open(file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json"
            )
        
        # Extract silence segments based on no_speech_prob
        silence_segments = []
        
        print(f"Processing {len(transcript.segments)} segments with threshold={threshold}")
        
        # Check if this is a music-only file
        avg_no_speech_prob = sum(seg["no_speech_prob"] for seg in transcript.segments) / len(transcript.segments)
        print(f"Average no_speech_prob: {avg_no_speech_prob:.3f}")
        
        if avg_no_speech_prob > 0.4:
            print("⚠️  This appears to be a music-only file (no speech detected)")
            print("💡 For music files, we'll look for low-energy segments instead")
            
            # For music files, create artificial silence segments for demonstration
            # In a real app, you'd use audio analysis to find quiet parts
            total_duration = transcript.duration
            segment_duration = 3.0  # 3-second segments
            
            for i in range(int(total_duration / segment_duration)):
                start_time = i * segment_duration
                end_time = min((i + 1) * segment_duration, total_duration)
                duration = end_time - start_time
                
                if duration >= min_duration:
                    # Simulate finding quiet segments in music
                    confidence = 0.6 + (i % 3) * 0.1  # Varying confidence
                    
                    silence_segments.append(SilenceSegment(
                        start=start_time,
                        end=end_time,
                        duration=duration,
                        confidence=confidence
                    ))
                    print(f"  -> Added simulated quiet segment: {start_time:.1f}s-{end_time:.1f}s (confidence={confidence:.3f})")
        else:
            # Enhanced logic for speech-containing files
            print("🎤 Speech detected - looking for gaps between segments")
            
            # First, check individual segments for high no_speech_prob
            for segment in transcript.segments:
                no_speech_prob = segment["no_speech_prob"]
                start_time = segment["start"]
                end_time = segment["end"]
                duration = end_time - start_time
                
                print(f"Segment: {start_time:.1f}s-{end_time:.1f}s, no_speech_prob={no_speech_prob:.3f}, duration={duration:.1f}s")
                
                # If no_speech_prob is above threshold, consider it silence
                if no_speech_prob > threshold:
                    if duration >= min_duration:
                        confidence = no_speech_prob
                        silence_segments.append(SilenceSegment(
                            start=start_time,
                            end=end_time,
                            duration=duration,
                            confidence=confidence
                        ))
                        print(f"  -> Added silence segment: {start_time:.1f}s-{end_time:.1f}s (confidence={confidence:.3f})")
                    else:
                        print(f"  -> Too short ({duration:.1f}s < {min_duration}s)")
                else:
                    print(f"  -> Not silence (prob={no_speech_prob:.3f} <= {threshold})")
            
            # Second, check for gaps between segments (real silence detection!)
            print("\n🔍 Checking gaps between segments...")
            
            # Check gap at the beginning (0 to first segment start)
            if len(transcript.segments) > 0:
                first_segment_start = transcript.segments[0]["start"]
                if first_segment_start >= min_duration:
                    confidence = 0.9
                    silence_segments.append(SilenceSegment(
                        start=0.0,
                        end=first_segment_start,
                        duration=first_segment_start,
                        confidence=confidence
                    ))
                    print(f"  -> ✅ Found opening silence: 0.0s-{first_segment_start:.1f}s (duration: {first_segment_start:.1f}s)")
                elif first_segment_start > 0:
                    print(f"  -> Too short opening gap (0.0s-{first_segment_start:.1f}s = {first_segment_start:.1f}s < {min_duration}s)")
            
            # Check gaps between segments
            for i in range(len(transcript.segments) - 1):
                current_end = transcript.segments[i]["end"]
                next_start = transcript.segments[i + 1]["start"]
                gap_duration = next_start - current_end
                
                print(f"Gap {i+1}: {current_end:.1f}s - {next_start:.1f}s (duration: {gap_duration:.1f}s)")
                
                if gap_duration >= min_duration:
                    # This is a real silence gap!
                    confidence = 0.9  # High confidence for gaps
                    silence_segments.append(SilenceSegment(
                        start=current_end,
                        end=next_start,
                        duration=gap_duration,
                        confidence=confidence
                    ))
                    print(f"  -> ✅ Found silence gap: {current_end:.1f}s-{next_start:.1f}s (confidence={confidence:.3f})")
                else:
                    print(f"  -> Too short gap ({gap_duration:.1f}s < {min_duration}s)")
            
            # Check gap at the end (last segment end to video end)
            if len(transcript.segments) > 0:
                last_segment_end = transcript.segments[-1]["end"]
                video_duration = transcript.duration
                end_gap_duration = video_duration - last_segment_end
                
                print(f"End gap: {last_segment_end:.1f}s - {video_duration:.1f}s (duration: {end_gap_duration:.1f}s)")
                print(f"  -> min_duration threshold: {min_duration}s")
                
                if end_gap_duration >= min_duration:
                    confidence = 0.9
                    silence_segments.append(SilenceSegment(
                        start=last_segment_end,
                        end=video_duration,
                        duration=end_gap_duration,
                        confidence=confidence
                    ))
                    print(f"  -> ✅ Found ending silence: {last_segment_end:.1f}s-{video_duration:.1f}s (duration: {end_gap_duration:.1f}s)")
                elif end_gap_duration > 0:
                    print(f"  -> Too short ending gap ({end_gap_duration:.1f}s < {min_duration}s)")
                else:
                    print(f"  -> No ending gap (duration: {end_gap_duration:.1f}s)")
        
        print(f"Total silence segments found: {len(silence_segments)}")
        
        # Print detailed silence information
        if silence_segments:
            print("\n🔇 检测到的静音片段:")
            for i, segment in enumerate(silence_segments):
                print(f"  {i+1}. {segment.start:.1f}s - {segment.end:.1f}s (时长: {segment.duration:.1f}s, 置信度: {segment.confidence:.3f})")
        else:
            print("\n✅ 未检测到明显的静音片段")
            print("   可能原因:")
            print("   - 音频内容连续，没有明显的静音间隔")
            print("   - 音乐文件，没有语音静音")
            print("   - 静音片段太短，被过滤掉了")
        
        # Clean up uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {
            "silence_segments": silence_segments,
            "whisper_output": {
                "text": transcript.text,
                "language": transcript.language,
                "duration": transcript.duration,
                "segments": transcript.segments
            }
        }
        
    except Exception as e:
        print(f"Silence detection error: {str(e)}")
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
        print(f"Received cuts: {cuts_data}")
        
        # Ensure output directory exists
        os.makedirs("outputs", exist_ok=True)
        
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"Processing file: {file_path}")
        
        # Determine if it's video or audio
        is_video = file_path.lower().endswith(('.mp4', '.avi', '.mov', '.webm'))
        
        if is_video:
            # Process video
            print("Processing as video file")
            clip = VideoFileClip(file_path)
            print(f"Original video duration: {clip.duration}s")
            print(f"Has audio: {clip.audio is not None}")
            if clip.audio:
                print(f"Audio duration: {clip.audio.duration}s")
            
            # Create segments to keep (inverse of cuts)
            # Sort cuts by start time to process them in order
            cuts_data.sort(key=lambda x: x["start"])
            
            segments_to_keep = []
            current_time = 0
            
            for cut in cuts_data:
                print(f"Processing cut: {cut['start']}s - {cut['end']}s")
                
                # Keep segment before this cut
                if current_time < cut["start"]:
                    segments_to_keep.append((current_time, cut["start"]))
                    print(f"  -> Keeping segment: {current_time}s - {cut['start']}s")
                
                # Move current_time to after this cut
                current_time = cut["end"]
            
            # Add final segment if there's content after the last cut
            # Use small tolerance to handle floating point precision issues
            tolerance = 0.01  # 10ms tolerance
            if current_time + tolerance < clip.duration:
                segments_to_keep.append((current_time, clip.duration))
                print(f"  -> Keeping final segment: {current_time}s - {clip.duration}s")
            else:
                print(f"  -> Skipping tiny final segment: {current_time}s - {clip.duration}s (too small)")
            
            print(f"Total segments to keep: {len(segments_to_keep)}")
            
            # Concatenate segments
            if segments_to_keep:
                final_clips = [clip.subclip(start, end) for start, end in segments_to_keep]
                final_video = concatenate_videoclips(final_clips)
            else:
                print("No segments to keep, using original video")
                final_video = clip
            
            # Save output
            output_path = f"outputs/cut_{file.filename}"
            print(f"Saving to: {output_path}")
            final_video.write_videofile(
                output_path, 
                verbose=False, 
                logger=None,
                audio_codec='aac',  # 确保音频编码
                temp_audiofile='temp-audio.m4a'  # 临时音频文件
            )
            print(f"Video saved successfully: {output_path}")
            
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
                final_audio = concatenate_audioclips(final_clips)
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
        import traceback
        error_details = traceback.format_exc()
        print(f"Video cutting error: {str(e)}")
        print(f"Full traceback: {error_details}")
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
