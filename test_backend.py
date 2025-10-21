#!/usr/bin/env python3
"""
Smart Cut Backend Test Script
Test if backend API is working properly
"""

import requests
import os
import sys

def test_api_health():
    """Test API health status"""
    try:
        response = requests.get("http://localhost:8000/")
        if response.status_code == 200:
            print("✅ API health check passed")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server (http://localhost:8000)")
        print("Please ensure backend service is running")
        return False
    except Exception as e:
        print(f"❌ API health check error: {e}")
        return False

def test_api_docs():
    """Test if API documentation is accessible"""
    try:
        response = requests.get("http://localhost:8000/docs")
        if response.status_code == 200:
            print("✅ API documentation accessible")
            return True
        else:
            print(f"❌ API documentation not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API documentation test error: {e}")
        return False

def main():
    print("🧪 Smart Cut Backend API Test")
    print("=" * 40)
    
    # Check environment variables
    if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") == "your_openai_api_key_here":
        print("⚠️  Warning: No valid OPENAI_API_KEY set")
        print("Please set your OpenAI API Key in .env file")
        print()
    
    # Run tests
    health_ok = test_api_health()
    docs_ok = test_api_docs()
    
    print()
    print("=" * 40)
    if health_ok and docs_ok:
        print("🎉 All tests passed! Backend API is running normally")
        print("📖 API Documentation: http://localhost:8000/docs")
        print("🚀 You can start using the frontend application")
    else:
        print("❌ Some tests failed, please check backend service")
        print("💡 Start backend: ./start_backend.sh")
        sys.exit(1)

if __name__ == "__main__":
    main()
