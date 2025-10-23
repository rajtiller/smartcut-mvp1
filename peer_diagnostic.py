#!/usr/bin/env python3
"""
Smart Cut Peer Machine Diagnostic Script
Diagnose transcription issues on peer machines
"""

import os
import sys
import requests
import tempfile
import subprocess
from dotenv import load_dotenv

def check_environment():
    """Check basic environment setup"""
    print("🔍 Environment Check")
    print("=" * 40)
    
    # Check Python version
    python_version = sys.version_info
    print(f"Python Version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Check if virtual environment is activated
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is activated")
    else:
        print("❌ Virtual environment is NOT activated")
        print("   Please run: source venv/bin/activate")
        return False
    
    # Check environment variables
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        print("❌ OpenAI API Key not set")
        print("   Please set OPENAI_API_KEY in .env file")
        return False
    else:
        print(f"✅ OpenAI API Key is set: {api_key[:10]}...")
    
    return True

def check_dependencies():
    """Check if all required packages are installed"""
    print("\n📦 Dependencies Check")
    print("=" * 40)
    
    required_packages = [
        'fastapi', 'uvicorn', 'openai', 'moviepy', 
        'librosa', 'soundfile', 'numpy', 'python-dotenv'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - MISSING")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("   Please run: pip install -r requirements.txt")
        return False
    
    return True

def check_openai_api():
    """Test OpenAI API connectivity"""
    print("\n🌐 OpenAI API Test")
    print("=" * 40)
    
    try:
        import openai
        from dotenv import load_dotenv
        
        load_dotenv()
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Create a simple test audio file
        import wave
        import struct
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            sample_rate = 44100
            duration = 1
            frames = int(sample_rate * duration)
            
            with wave.open(tmp_file.name, 'w') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                
                # Create simple audio data
                for i in range(frames):
                    value = int(1000 * (i / sample_rate))
                    wav_file.writeframes(struct.pack('<h', value))
            
            # Test OpenAI API
            with open(tmp_file.name, 'rb') as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json"
                )
                print("✅ OpenAI API test successful")
                print(f"   Response: {response.text[:50]}...")
                return True
                
    except Exception as e:
        print(f"❌ OpenAI API test failed: {e}")
        return False
    finally:
        if 'tmp_file' in locals():
            os.unlink(tmp_file.name)

def check_backend_service():
    """Check if backend service is running"""
    print("\n🚀 Backend Service Check")
    print("=" * 40)
    
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ Backend service is running")
            return True
        else:
            print(f"❌ Backend service returned status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend service")
        print("   Please start backend: ./start_backend.sh")
        return False
    except Exception as e:
        print(f"❌ Backend service check failed: {e}")
        return False

def check_file_permissions():
    """Check file permissions for uploads and outputs"""
    print("\n📁 File Permissions Check")
    print("=" * 40)
    
    directories = ['uploads', 'outputs']
    
    for directory in directories:
        if not os.path.exists(directory):
            try:
                os.makedirs(directory)
                print(f"✅ Created directory: {directory}")
            except Exception as e:
                print(f"❌ Cannot create directory {directory}: {e}")
                return False
        else:
            print(f"✅ Directory exists: {directory}")
        
        # Check write permissions
        test_file = os.path.join(directory, 'test_write.tmp')
        try:
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            print(f"✅ Write permission OK: {directory}")
        except Exception as e:
            print(f"❌ Write permission failed for {directory}: {e}")
            return False
    
    return True

def check_network_connectivity():
    """Check network connectivity to OpenAI"""
    print("\n🌐 Network Connectivity Check")
    print("=" * 40)
    
    try:
        response = requests.get("https://api.openai.com/v1/models", timeout=10)
        if response.status_code == 200:
            print("✅ Can reach OpenAI API")
            return True
        else:
            print(f"❌ OpenAI API returned status: {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print("❌ Network timeout - check internet connection")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot reach OpenAI API - check network/firewall")
        return False
    except Exception as e:
        print(f"❌ Network check failed: {e}")
        return False

def main():
    print("🔧 Smart Cut Peer Machine Diagnostic")
    print("=" * 50)
    
    checks = [
        ("Environment Setup", check_environment),
        ("Dependencies", check_dependencies),
        ("File Permissions", check_file_permissions),
        ("Network Connectivity", check_network_connectivity),
        ("OpenAI API", check_openai_api),
        ("Backend Service", check_backend_service),
    ]
    
    results = []
    
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"❌ {check_name} check crashed: {e}")
            results.append((check_name, False))
    
    print("\n" + "=" * 50)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {check_name}")
        if not result:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All checks passed! Transcription should work.")
        print("💡 If still failing, check the specific error in browser console.")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        print("\n🔧 Common Solutions:")
        print("1. Activate virtual environment: source venv/bin/activate")
        print("2. Install dependencies: pip install -r requirements.txt")
        print("3. Set OpenAI API key in .env file")
        print("4. Start backend service: ./start_backend.sh")
        print("5. Check network/firewall settings")

if __name__ == "__main__":
    main()
