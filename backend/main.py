import os
import shutil
from typing import List, Optional, Dict
import ffmpeg
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import openai
import librosa
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Smart Cut API", version="1.0.0")

# CORS middleware - Allow all origins in production, specific origins in dev
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:4173")
if cors_origins == "*":
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
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
    debug_info: Optional[Dict[str, str]] = None


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

    # Check file type - allow formats supported by OpenAI Whisper plus formats we can convert
    whisper_supported = {
        ".flac",
        ".m4a",
        ".mp3",
        ".mp4",
        ".mpeg",
        ".mpga",
        ".oga",
        ".ogg",
        ".wav",
        ".webm",
    }
    convertible_formats = {
        ".avi",
        ".mov",
    }  # Formats we can convert to supported formats
    all_supported = whisper_supported.union(convertible_formats)
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in all_supported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Supported formats: {', '.join(sorted(all_supported))}",
        )

    # Define video formats and check if file is video (needed in finally block)
    video_formats = {".mp4", ".avi", ".mov", ".webm", ".mpeg", ".mkv", ".flv"}
    is_video = file_ext in video_formats
    
    # Initialize variables for cleanup in finally block
    file_path = None
    temp_audio_file_created = False
    audio_file_path = None
    whisper_file_path = None

    try:
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # For video files, extract audio only to reduce file size for Whisper API
        # Audio files are much smaller than video files (typically 1-5MB vs 20-50MB+)
        whisper_file_path = file_path

        if is_video:
            # Extract audio from video to reduce file size
            # Use mp3 format which is well-compressed and supported by Whisper
            audio_file_path = f"uploads/temp_audio_{os.path.splitext(file.filename)[0]}.mp3"
            try:
                print(f"Extracting audio from video: {file_path} -> {audio_file_path}")
                (
                    ffmpeg.input(file_path)
                    .output(audio_file_path, acodec="libmp3lame", audio_bitrate="128k")
                    .overwrite_output()
                    .run(quiet=True)
                )
                whisper_file_path = audio_file_path
                temp_audio_file_created = True
                print(f"Audio extraction successful. File size reduced for Whisper API.")
            except ffmpeg.Error as e:
                raise HTTPException(
                    status_code=500, detail=f"Audio extraction failed: {str(e)}"
                )
        elif file_ext in [".avi", ".mov"]:
            # Convert unsupported video formats to mp4 for Whisper
            converted_path = (
                f"uploads/converted_{os.path.splitext(file.filename)[0]}.mp4"
            )
            try:
                (
                    ffmpeg.input(file_path)
                    .output(converted_path, vcodec="libx264", acodec="aac")
                    .overwrite_output()
                    .run(quiet=True)
                )
                whisper_file_path = converted_path
                temp_audio_file_created = True
            except ffmpeg.Error as e:
                raise HTTPException(
                    status_code=500, detail=f"Video conversion failed: {e}"
                )

        # Transcribe using OpenAI Whisper (only audio file for videos)
        print(f"Sending file to Whisper API: {whisper_file_path}")
        with open(whisper_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", file=audio_file, response_format="verbose_json"
            )

        # Debug: Print transcript structure
        print(f"=== TRANSCRIPT DEBUG INFO ===")
        print(f"Transcript type: {type(transcript)}")
        print(f"Transcript attributes: {dir(transcript)}")
        print(f"Transcript text: {getattr(transcript, 'text', 'NO TEXT')}")
        print(f"Transcript language: {getattr(transcript, 'language', 'NO LANGUAGE')}")

        if hasattr(transcript, "segments"):
            print(f"Segments type: {type(transcript.segments)}")
            print(
                f"Number of segments: {len(transcript.segments) if transcript.segments else 0}"
            )
            if transcript.segments and len(transcript.segments) > 0:
                print(f"First segment type: {type(transcript.segments[0])}")
                print(f"First segment: {transcript.segments[0]}")
                if hasattr(transcript.segments[0], "__dict__"):
                    print(
                        f"First segment attributes: {transcript.segments[0].__dict__}"
                    )
                elif isinstance(transcript.segments[0], dict):
                    print(f"First segment keys: {list(transcript.segments[0].keys())}")
                    print(f"First segment values: {transcript.segments[0]}")
        else:
            print("No segments attribute found")
        print(f"=== END DEBUG INFO ===")

        # Convert to our model format
        segments = []
        if hasattr(transcript, "segments") and transcript.segments:
            for seg in transcript.segments:
                # Handle both dictionary and object formats
                if isinstance(seg, dict):
                    # Dictionary format
                    segments.append(
                        TranscriptionSegment(
                            id=seg.get("id", 0),
                            seek=seg.get("seek", 0.0),
                            start=seg.get("start", 0.0),
                            end=seg.get("end", 0.0),
                            text=seg.get("text", ""),
                            tokens=seg.get("tokens", []),
                            temperature=seg.get("temperature", 0.0),
                            avg_logprob=seg.get("avg_logprob", 0.0),
                            compression_ratio=seg.get("compression_ratio", 0.0),
                            no_speech_prob=seg.get("no_speech_prob", 0.0),
                        )
                    )
                else:
                    # Object format - use getattr
                    segments.append(TranscriptionSegment(
                        id=getattr(seg, "id", 0),
                        seek=getattr(seg, "seek", 0.0),
                        start=getattr(seg, "start", 0.0),
                        end=getattr(seg, "end", 0.0),
                        text=getattr(seg, "text", ""),
                        tokens=getattr(seg, "tokens", []),
                        temperature=getattr(seg, "temperature", 0.0),
                        avg_logprob=getattr(seg, "avg_logprob", 0.0),
                        compression_ratio=getattr(seg, "compression_ratio", 0.0),
                        no_speech_prob=getattr(seg, "no_speech_prob", 0.0)
                    ))
        
        # Create debug info for frontend display
        debug_info = {
            "raw_transcript": str(transcript),
            "transcript_text": str(getattr(transcript, 'text', 'NO TEXT')),
            "transcript_language": str(getattr(transcript, 'language', 'NO LANGUAGE')),
            "transcript_duration": str(getattr(transcript, 'duration', 'NO DURATION')),
            "transcript_words": str(getattr(transcript, 'words', 'NO WORDS')),
            "transcript_segments": str(getattr(transcript, 'segments', 'NO SEGMENTS')),
            "processed_segments_count": str(len(segments)),
            "segments_structure": str([str(seg) for seg in segments[:3]] if segments else "No segments")
        }
        
        result = TranscriptionResult(
            text=getattr(transcript, "text", ""),
            segments=segments,
            language=getattr(transcript, 'language', 'unknown'),
            debug_info=debug_info
        )

        # Print the complete Whisper output for debugging
        print(f"=== COMPLETE WHISPER OUTPUT ===")
        print(f"Raw transcript object: {transcript}")
        print(f"Transcript text: {getattr(transcript, 'text', 'NO TEXT')}")
        print(f"Transcript language: {getattr(transcript, 'language', 'NO LANGUAGE')}")
        print(f"Transcript duration: {getattr(transcript, 'duration', 'NO DURATION')}")
        print(f"Transcript words: {getattr(transcript, 'words', 'NO WORDS')}")
        print(f"Transcript segments: {getattr(transcript, 'segments', 'NO SEGMENTS')}")
        print(f"=== END WHISPER OUTPUT ===")

        return result

    except Exception as e:
        print(f"Transcription error: {str(e)}")  # 添加详细日志
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up: Only remove temporary audio files, keep original video file for cutting
        # The original video file is needed for the /cut-video endpoint
        if (
            temp_audio_file_created
            and audio_file_path
            and os.path.exists(audio_file_path)
        ):
            print(f"Cleaning up temporary audio file: {audio_file_path}")
            try:
                os.remove(audio_file_path)
            except Exception as e:
                print(f"Warning: Could not remove temporary audio file: {e}")
        
        # Also clean up any other temporary converted files (for .avi, .mov conversion)
        if (
            temp_audio_file_created
            and whisper_file_path
            and file_path
            and whisper_file_path != file_path
            and os.path.exists(whisper_file_path)
            and not (is_video and whisper_file_path == audio_file_path)
        ):
            print(f"Cleaning up temporary converted file: {whisper_file_path}")
            try:
                os.remove(whisper_file_path)
            except Exception as e:
                print(f"Warning: Could not remove temporary file: {e}")
        
        # Note: We keep the original file_path (original video/audio file) 
        # because it may be needed for the /cut-video endpoint
        # The frontend will handle re-uploading if needed

class SilenceDetectionRequest(BaseModel):
    segments: List[TranscriptionSegment]
    min_duration: float = 1.0
    total_duration: Optional[float] = None

class SilenceDetectionWithFileRequest(BaseModel):
    min_duration: float = 1.0
    threshold: float = 0.4

@app.post("/detect-silence")
async def detect_silence(request: SilenceDetectionRequest):
    """Detect silence segments using 1-second segments with no_speech_prob > 0.6"""
    
    try:
        segments = request.segments
        min_duration = request.min_duration
        
        if not segments:
            raise HTTPException(status_code=400, detail="No transcription segments provided")
        
        # Sort segments by start time
        sorted_segments = sorted(segments, key=lambda x: x.start)
        
        print(f"=== SILENCE DETECTION DEBUG ===")
        print(f"Processing {len(sorted_segments)} transcription segments")
        print(f"Min duration threshold: {min_duration}s")
        
        # Get total duration from the last segment or request
        total_duration = request.total_duration
        if not total_duration and sorted_segments:
            total_duration = sorted_segments[-1].end
        
        if not total_duration:
            raise HTTPException(status_code=400, detail="Total duration not provided")
        
        print(f"Total duration: {total_duration}s")
        
        # Create 1-second segments and get no_speech_prob for each
        silence_1s_segments = []
        
        # We need the original file path to extract 1s segments
        # This should be passed in the request or we need to modify the approach
        # For now, let's assume we have access to the file path
        # We'll need to modify the request model to include the file path
        
        print("Note: This approach requires the original file to extract 1s segments")
        print("We need to modify the request to include the file path or file content")
        
        # For now, let's use the existing segments but extract 1s segments
        # This is a placeholder - we need the actual file to extract segments
        for i in range(int(total_duration)):
            segment_start = float(i)
            segment_end = float(i + 1)
            
            # TODO: Extract 1s segment from original file and send to Whisper
            # For now, use placeholder logic
            silence_1s_segments.append({
                'start': segment_start,
                'end': segment_end,
                'no_speech_prob': 0.5  # Placeholder - needs actual Whisper analysis
            })
            print(f"1s segment {segment_start}-{segment_end}: no_speech_prob=0.5 (placeholder)")
        
        # Filter segments with no_speech_prob < 0.4
        high_silence_segments = [
            seg for seg in silence_1s_segments 
            if seg['no_speech_prob'] < 0.4
        ]
        
        print(f"Found {len(high_silence_segments)} 1s segments with no_speech_prob < 0.4")
        
        # Group contiguous segments together
        silence_segments = []
        if high_silence_segments:
            current_start = high_silence_segments[0]['start']
            current_end = high_silence_segments[0]['end']
            
            for i in range(1, len(high_silence_segments)):
                seg = high_silence_segments[i]
                
                # If this segment is contiguous with the current group
                if seg['start'] == current_end:
                    current_end = seg['end']
                else:
                    # End current group and start new one
                    duration = current_end - current_start
                    if duration >= min_duration:
                        confidence = min(1.0, duration / 5.0)
                        silence_segments.append(SilenceSegment(
                            start=current_start,
                            end=current_end,
                            duration=duration,
                            confidence=confidence
                        ))
                        print(f"Added grouped silence segment: {current_start}s - {current_end}s ({duration}s)")
                    
                    current_start = seg['start']
                    current_end = seg['end']
            
            # Add the last group
            duration = current_end - current_start
            if duration >= min_duration:
                confidence = min(1.0, duration / 5.0)
                silence_segments.append(SilenceSegment(
                    start=current_start,
                    end=current_end,
                    duration=duration,
                    confidence=confidence
                ))
                print(f"Added final grouped silence segment: {current_start}s - {current_end}s ({duration}s)")
        
        print(f"Total grouped silence segments found: {len(silence_segments)}")
        print(f"=== END SILENCE DETECTION DEBUG ===")
        
        return {"silence_segments": silence_segments}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Silence detection failed: {str(e)}"
        )


@app.post("/detect-silence-5s")
async def detect_silence_5s(file: UploadFile = File(...), min_duration: float = 1.0, threshold: float = 0.75):
    """Detect silence segments by analyzing each 5-second segment with Whisper"""
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get total duration
        try:
            probe = ffmpeg.probe(file_path)
            total_duration = float(probe["format"]["duration"])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not get video duration: {e}")
        
        print(f"=== 5-SECOND SILENCE DETECTION ===")
        print(f"File: {file.filename}")
        print(f"Total duration: {total_duration}s")
        print(f"Threshold: {threshold}")
        print(f"Min duration: {min_duration}s")
        
        silence_5s_segments = []
        
        # Analyze each 5-second segment
        for i in range(0, int(total_duration), 5):
            segment_start = float(i)
            segment_end = min(float(i + 5), total_duration)
            segment_duration = segment_end - segment_start
            
            # Extract 5-second segment using ffmpeg
            temp_segment_path = f"uploads/temp_segment_{i}.wav"
            try:
                (
                    ffmpeg.input(file_path, ss=segment_start, t=segment_duration)
                    .output(temp_segment_path, acodec="pcm_s16le", ar=16000)
                    .overwrite_output()
                    .run(quiet=True)
                )
                
                # Analyze with Whisper
                with open(temp_segment_path, "rb") as audio_file:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1", 
                        file=audio_file, 
                        response_format="verbose_json"
                    )
                
                # Get no_speech_prob from the transcript
                no_speech_prob = 0.5  # Default to neutral
                
                # Debug: Print transcript structure
                print(f"Segment {i} transcript type: {type(transcript)}")
                print(f"Segment {i} transcript attributes: {dir(transcript)}")
                
                # Try to get no_speech_prob from segments
                if hasattr(transcript, 'segments') and transcript.segments:
                    print(f"Segment {i} has {len(transcript.segments)} segments")
                    
                    # Look for no_speech_prob in any segment
                    for j, seg in enumerate(transcript.segments):
                        print(f"Segment {i}, sub-segment {j}: {seg}")
                        
                        if hasattr(seg, 'no_speech_prob'):
                            no_speech_prob = seg.no_speech_prob
                            print(f"Segment {i} no_speech_prob (attr): {no_speech_prob}")
                            break
                        elif isinstance(seg, dict) and 'no_speech_prob' in seg:
                            no_speech_prob = seg['no_speech_prob']
                            print(f"Segment {i} no_speech_prob (dict): {no_speech_prob}")
                            break
                    
                    if no_speech_prob == 0.5:
                        print(f"Segment {i} no no_speech_prob found in any sub-segment")
                else:
                    print(f"Segment {i} no segments found in transcript")
                
                # Fallback: If no segments or no no_speech_prob, check if there's any text
                if no_speech_prob == 0.5:
                    transcript_text = getattr(transcript, 'text', '') if hasattr(transcript, 'text') else ''
                    if transcript_text and transcript_text.strip():
                        # If there's text, assume it's speech (no_speech_prob = 0)
                        no_speech_prob = 1.0
                        print(f"Segment {i} has text '{transcript_text}', setting no_speech_prob to 0.0")
                    else:
                        # If no text, assume silence (no_speech_prob = 0)
                        no_speech_prob = 0.0
                        print(f"Segment {i} no text found, setting no_speech_prob to 0.0")
                
                silence_5s_segments.append({
                    'start': segment_start,
                    'end': segment_end,
                    'no_speech_prob': no_speech_prob
                })
                
                print(f"5s segment {segment_start}-{segment_end}: no_speech_prob={no_speech_prob}")
                
                # Clean up temp file
                os.remove(temp_segment_path)
                
            except Exception as e:
                print(f"Error processing segment {i}: {e}")
                # If there's a 500 error or any error, set to 0.5
                silence_5s_segments.append({
                    'start': segment_start,
                    'end': segment_end,
                    'no_speech_prob': 0.5
                })
        
        # Filter segments with no_speech_prob > threshold
        high_silence_segments = [
            seg for seg in silence_5s_segments 
            if seg['no_speech_prob'] > threshold
        ]
        
        print(f"Found {len(high_silence_segments)} 5s segments with no_speech_prob > {threshold}")
        
        # Group contiguous segments together
        silence_segments = []
        if high_silence_segments:
            current_start = high_silence_segments[0]['start']
            current_end = high_silence_segments[0]['end']
            
            for i in range(1, len(high_silence_segments)):
                seg = high_silence_segments[i]
                
                # If this segment is contiguous with the current group
                if seg['start'] == current_end:
                    current_end = seg['end']
                else:
                    # End current group and start new one
                    duration = current_end - current_start
                    if duration >= min_duration:
                        confidence = min(1.0, duration / 5.0)
                        silence_segments.append(SilenceSegment(
                            start=current_start,
                            end=current_end,
                            duration=duration,
                            confidence=confidence
                        ))
                        print(f"Added grouped silence segment: {current_start}s - {current_end}s ({duration}s)")
                    
                    current_start = seg['start']
                    current_end = seg['end']
            
            # Add the last group
            duration = current_end - current_start
            if duration >= min_duration:
                confidence = min(1.0, duration / 5.0)
                silence_segments.append(SilenceSegment(
                    start=current_start,
                    end=current_end,
                    duration=duration,
                    confidence=confidence
                ))
                print(f"Added final grouped silence segment: {current_start}s - {current_end}s ({duration}s)")
        
        print(f"Total grouped silence segments found: {len(silence_segments)}")
        print(f"=== END 5-SECOND SILENCE DETECTION ===")
        
        # Clean up uploaded file
        try:
            os.remove(file_path)
        except Exception:
            pass
        
        return {"silence_segments": silence_segments}
        
    except Exception as e:
        # Clean up on error
        if "file_path" in locals() and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        
        raise HTTPException(
            status_code=500, detail=f"5-second silence detection failed: {str(e)}"
        )


@app.post("/cut-video")
async def cut_video(file: UploadFile = File(...), cuts: str = Form(...)):
    """Cut video/audio based on silence segments"""
    import json
    import shutil
    import os
    import tempfile

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    try:
        # Parse cuts
        cuts_data = json.loads(cuts)

        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Create segments to keep (inverse of cuts)
        segments_to_keep = []
        current_time = 0.0

        # Sort cuts by start time
        cuts_data.sort(key=lambda x: x["start"])

        for cut in cuts_data:
            start = float(cut["start"])
            end = float(cut["end"])

            # Add segment before this cut
            if current_time < start:
                segments_to_keep.append({"start": current_time, "end": start})

            # Move current time to end of cut
            current_time = max(current_time, end)

        # Get total duration and add final segment
        try:
            probe = ffmpeg.probe(file_path)
            duration = float(probe["format"]["duration"])

            if current_time < duration:
                segments_to_keep.append({"start": current_time, "end": duration})
        except Exception as e:
            print(f"Could not get duration: {e}")

        if not segments_to_keep:
            raise HTTPException(
                status_code=400, detail="No segments to keep after cuts"
            )

        # Output path
        output_filename = f"cut_{file.filename}"
        output_path = f"outputs/{output_filename}"

        # Ensure output directory exists
        os.makedirs("outputs", exist_ok=True)

        if len(segments_to_keep) == 1:
            # Single segment - simple cut
            segment = segments_to_keep[0]
            start_time = segment["start"]
            duration = segment["end"] - segment["start"]

            (
                ffmpeg.input(file_path, ss=start_time, t=duration)
                .output(output_path, acodec="copy", vcodec="copy")
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        else:
            # Multiple segments - need to concatenate
            temp_dir = tempfile.mkdtemp(prefix="smartcut_")
            segment_files = []

            try:
                # Create temporary files for each segment
                for i, segment in enumerate(segments_to_keep):
                    start_time = segment["start"]
                    duration = segment["end"] - segment["start"]
                    temp_file = os.path.join(temp_dir, f"segment_{i}.mp4")

                    (
                        ffmpeg.input(file_path, ss=start_time, t=duration)
                        .output(temp_file, acodec="copy", vcodec="copy")
                        .overwrite_output()
                        .run(capture_stdout=True, capture_stderr=True)
                    )
                    segment_files.append(temp_file)

                # Create concat file
                concat_file = os.path.join(temp_dir, "concat.txt")
                with open(concat_file, "w") as f:
                    for segment_file in segment_files:
                        f.write(f"file '{segment_file}'\n")

                # Concatenate segments
                (
                    ffmpeg.input(concat_file, format="concat", safe=0)
                    .output(output_path, acodec="copy", vcodec="copy")
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )

            finally:
                # Clean up temp directory
                try:
                    shutil.rmtree(temp_dir)
                except Exception:
                    pass

        # Clean up input file
        try:
            os.remove(file_path)
        except Exception:
            pass

        return {
            "message": "Video cut successfully",
            "output_file": output_filename,
            "segments_kept": len(segments_to_keep),
        }

    except ffmpeg.Error as e:
        # Clean up on FFmpeg error
        if "file_path" in locals() and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        stderr_output = e.stderr.decode() if e.stderr else "Unknown FFmpeg error"
        raise HTTPException(
            status_code=500, detail=f"Video processing failed: {stderr_output}"
        )

    except Exception as e:
        # Clean up on any other error
        if "file_path" in locals() and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        raise HTTPException(status_code=500, detail=f"Video cutting failed: {str(e)}")


@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download processed file"""

    file_path = f"outputs/{filename}"

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path, filename=filename, media_type="application/octet-stream"
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
