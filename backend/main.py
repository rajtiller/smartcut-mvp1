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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
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

    try:
        # Save uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Convert file to a format supported by Whisper if needed
        whisper_file_path = file_path
        temp_file_created = False

        # Check if we need to convert the file
        if file_ext in [".avi", ".mov"]:
            # Convert video to mp4 for Whisper using ffmpeg
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
                temp_file_created = True
            except ffmpeg.Error as e:
                raise HTTPException(
                    status_code=500, detail=f"Video conversion failed: {e}"
                )

        # Transcribe using OpenAI Whisper
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
        # Clean up uploaded file and any temporary converted file
        if "file_path" in locals() and os.path.exists(file_path):
            os.remove(file_path)
        if (
            "temp_file_created" in locals()
            and temp_file_created
            and "whisper_file_path" in locals()
            and os.path.exists(whisper_file_path)
        ):
            os.remove(whisper_file_path)

class SilenceDetectionRequest(BaseModel):
    segments: List[TranscriptionSegment]
    min_duration: float = 1.0

@app.post("/detect-silence")
async def detect_silence(request: SilenceDetectionRequest):
    """Detect silence segments between transcription segments"""
    
    try:
        segments = request.segments
        min_duration = request.min_duration
        
        if not segments:
            raise HTTPException(status_code=400, detail="No transcription segments provided")
        
        # Sort segments by start time
        sorted_segments = sorted(segments, key=lambda x: x.start)
        
        silence_segments = []
        
        # Find gaps between consecutive segments
        for i in range(len(sorted_segments) - 1):
            current_segment = sorted_segments[i]
            next_segment = sorted_segments[i + 1]
            
            # Calculate gap between end of current and start of next
            gap_start = current_segment.end
            gap_end = next_segment.start
            gap_duration = gap_end - gap_start
            
            # Only consider gaps that are long enough
            if gap_duration >= min_duration:
                # Calculate confidence based on gap duration
                confidence = min(1.0, gap_duration / 5.0)  # Max confidence at 5 seconds
                
                silence_segments.append(SilenceSegment(
                    start=gap_start,
                    end=gap_end,
                    duration=gap_duration,
                    confidence=confidence
                ))
        
        return {"silence_segments": silence_segments}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Silence detection failed: {str(e)}"
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
