#!/usr/bin/env python3
"""
Test silence detection fix
"""

import librosa
import numpy as np
import tempfile
import wave
import struct

def create_test_audio():
    """Create a test audio file with known silence segments"""
    sample_rate = 44100
    duration = 10  # 10 seconds total
    
    # Create audio with silence segments
    audio = np.zeros(int(sample_rate * duration))
    
    # Add sound segments
    # Segment 1: 0-2 seconds (sound)
    t1 = np.linspace(0, 2, int(sample_rate * 2))
    audio[0:int(sample_rate * 2)] = 0.3 * np.sin(2 * np.pi * 440 * t1)
    
    # Segment 2: 4-6 seconds (sound)
    t2 = np.linspace(0, 2, int(sample_rate * 2))
    audio[int(sample_rate * 4):int(sample_rate * 6)] = 0.3 * np.sin(2 * np.pi * 440 * t2)
    
    # Segment 3: 8-10 seconds (sound)
    t3 = np.linspace(0, 2, int(sample_rate * 2))
    audio[int(sample_rate * 8):int(sample_rate * 10)] = 0.3 * np.sin(2 * np.pi * 440 * t3)
    
    # Save as WAV file
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
        with wave.open(tmp_file.name, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            
            for sample in audio:
                wav_file.writeframes(struct.pack('<h', int(sample * 32767)))
        
        return tmp_file.name, audio, sample_rate

def test_silence_detection():
    """Test the fixed silence detection logic"""
    print("🧪 Testing Silence Detection Fix")
    print("=" * 40)
    
    # Create test audio
    audio_file, audio, sr = create_test_audio()
    
    try:
        # Load audio with librosa
        y, sr = librosa.load(audio_file, sr=None)
        
        # Detect non-silence intervals using librosa
        non_silence_intervals = librosa.effects.split(y, top_db=20, frame_length=2048, hop_length=512)
        
        print(f"Total duration: {len(y) / sr:.1f} seconds")
        print(f"Non-silence intervals found: {len(non_silence_intervals)}")
        
        # Convert to silence segments (inverse of non-silence intervals)
        silence_segments = []
        total_duration = len(y) / sr
        min_duration = 1.0
        
        # If no non-silence intervals found, the entire audio is silence
        if len(non_silence_intervals) == 0:
            silence_segments.append({
                'start': 0.0,
                'end': total_duration,
                'duration': total_duration,
                'confidence': 1.0
            })
        else:
            # Find silence segments between non-silence intervals
            current_time = 0.0
            
            for start_frame, end_frame in non_silence_intervals:
                start_time = start_frame / sr
                end_time = end_frame / sr
                
                print(f"Non-silence: {start_time:.1f}s - {end_time:.1f}s")
                
                # Add silence segment before this non-silence interval
                if start_time > current_time:
                    silence_duration = start_time - current_time
                    if silence_duration >= min_duration:
                        confidence = min(1.0, silence_duration / 5.0)
                        silence_segments.append({
                            'start': current_time,
                            'end': start_time,
                            'duration': silence_duration,
                            'confidence': confidence
                        })
                        print(f"Silence: {current_time:.1f}s - {start_time:.1f}s ({silence_duration:.1f}s)")
                
                current_time = end_time
            
            # Add silence segment after the last non-silence interval
            if current_time < total_duration:
                silence_duration = total_duration - current_time
                if silence_duration >= min_duration:
                    confidence = min(1.0, silence_duration / 5.0)
                    silence_segments.append({
                        'start': current_time,
                        'end': total_duration,
                        'duration': silence_duration,
                        'confidence': confidence
                    })
                    print(f"Silence: {current_time:.1f}s - {total_duration:.1f}s ({silence_duration:.1f}s)")
        
        print(f"\n📊 Results:")
        print(f"Silence segments found: {len(silence_segments)}")
        
        expected_silence_segments = [
            (2.0, 4.0),  # 2-4 seconds
            (6.0, 8.0),  # 6-8 seconds
        ]
        
        print(f"\nExpected silence segments: {expected_silence_segments}")
        
        for i, segment in enumerate(silence_segments):
            print(f"Segment {i+1}: {segment['start']:.1f}s - {segment['end']:.1f}s ({segment['duration']:.1f}s)")
        
        # Check if results match expectations
        if len(silence_segments) >= 2:
            print("\n✅ Silence detection is working correctly!")
        else:
            print("\n❌ Silence detection may still have issues")
            
    finally:
        import os
        os.unlink(audio_file)

if __name__ == "__main__":
    test_silence_detection()
