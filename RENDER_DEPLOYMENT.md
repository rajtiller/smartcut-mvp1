# Render Deployment Guide

This guide will walk you through deploying Smartcut MVP to Render.

## Prerequisites

- A Render account (sign up at https://render.com)
- Your OpenAI API key
- A GitHub repository with your code (Render will pull from GitHub)

## Overview

Your application consists of two services:

1. **Backend** - FastAPI Python service handling video processing
2. **Frontend** - React/Vite application serving the UI

## Deployment Options

### Option 1: Using render.yaml (Infrastructure as Code) - RECOMMENDED

This is the easiest way to deploy both services at once.

#### Steps:

1. **Push your code to GitHub**

   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Connect Repository to Render**

   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository and branch (main)
   - Render will automatically detect `render.yaml`
   - Click "Apply"

3. **Set Environment Variables**

   **Backend (`smartcut-backend`):**

   - In the Render dashboard, go to the `smartcut-backend` service
   - Navigate to "Environment" tab
   - Add the following environment variable:
     - `OPENAI_API_KEY`: Your OpenAI API key (mark as "Secret") - **REQUIRED**
   - Optional:
     - `CORS_ORIGINS`: Set to your frontend URL or "_" (default: "_")

   **Frontend (`smartcut-frontend`):**

   - ⚠️ **IMPORTANT**: Wait for the backend to deploy first
   - Note the backend URL (e.g., `https://smartcut-backend.onrender.com`)
   - Go to `smartcut-frontend` service → "Environment" tab
   - Add environment variable:
     - `VITE_API_URL`: Set to your backend URL (e.g., `https://smartcut-backend.onrender.com`)
   - After setting `VITE_API_URL`, trigger a manual rebuild (or wait for auto-redeploy)

4. **Deploy**
   - Render will automatically build and deploy both services
   - Wait for both services to show "Live" status

### Option 2: Manual Service Creation

If you prefer to create services manually:

#### Backend Service

1. **Create New Web Service**

   - Go to https://dashboard.render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Backend Service**

   - **Name**: `smartcut-backend`
   - **Environment**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: Starter (or higher for better performance)

3. **Set Environment Variables**

   - `OPENAI_API_KEY`: Your OpenAI API key
   - `CORS_ORIGINS`: `*` or your frontend URL
   - `PYTHON_VERSION`: `3.12.0` (Required for pandas compatibility)

4. **Advanced Settings**
   - Health Check Path: `/`
   - Auto-Deploy: `Yes`

#### Frontend Service

1. **Create New Web Service**

   - Click "New" → "Web Service"
   - Connect the same GitHub repository

2. **Configure Frontend Service**

   - **Name**: `smartcut-frontend`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install && VITE_API_URL=https://smartcut-backend.onrender.com npm run build && npm install -g serve
     ```
     (Replace `smartcut-backend.onrender.com` with your actual backend URL)
   - **Start Command**:
     ```bash
     serve -s dist -l $PORT
     ```
   - **Plan**: Starter

3. **Set Environment Variables**
   - `NODE_VERSION`: `18.17.0`
   - `VITE_API_URL`: Your backend URL (e.g., `https://smartcut-backend.onrender.com`)

## Important Notes

### FFmpeg Installation

The backend requires FFmpeg for video processing. Render's build environment should include FFmpeg by default, but if you encounter issues:

1. The `ffmpeg-python` package is a wrapper - the FFmpeg binary must be available
2. If FFmpeg is not available, you may need to install it in the build command:
   ```bash
   sudo apt-get update && sudo apt-get install -y ffmpeg && pip install -r requirements.txt
   ```
   However, Render's build environment doesn't support `sudo`. Contact Render support if FFmpeg is not available.

### File Storage

- Render provides ephemeral disk storage for file uploads
- Files in `uploads/` and `outputs/` directories will be deleted when the service restarts
- For production, consider using:
  - Render Disk (persistent storage) - upgrade your plan
  - Cloud storage (S3, etc.) for file persistence

### CORS Configuration

- The backend is configured to accept all origins (`*`) by default
- For production, set `CORS_ORIGINS` to your specific frontend URL:
  ```
  CORS_ORIGINS=https://smartcut-frontend.onrender.com
  ```

### API URL Configuration

The frontend uses the `VITE_API_URL` environment variable at build time. Make sure to:

1. Set it before building (in build command or environment variables)
2. Rebuild if you change the backend URL

## Post-Deployment

### Testing Your Deployment

1. **Test Backend**

   - Visit: `https://smartcut-backend.onrender.com`
   - Should see: `{"message":"Smart Cut API is running!"}`
   - Visit: `https://smartcut-backend.onrender.com/docs` for API documentation

2. **Test Frontend**
   - Visit your frontend URL
   - Try uploading a test video file
   - Check browser console for any CORS or API errors

### Monitoring

- Check Render dashboard for logs
- Monitor service health in the "Metrics" tab
- Set up alerts for service downtime

## Troubleshooting

### Build Fails

- Check build logs in Render dashboard
- Ensure all dependencies are in `requirements.txt` and `package.json`
- Verify Python and Node versions

### Backend Not Starting

- Check logs for errors
- Verify `OPENAI_API_KEY` is set
- Ensure port is set correctly: `--port $PORT`

### Frontend Can't Connect to Backend

- Verify `VITE_API_URL` is set correctly
- Check CORS configuration in backend
- Ensure backend URL is accessible (not returning 404)

### FFmpeg Errors

- Verify FFmpeg is available in the environment
- Check that `ffmpeg-python` is installed
- Contact Render support if FFmpeg binary is missing

## Cost Considerations

- **Starter Plan**: Free tier available (with limitations)
  - Services may spin down after inactivity
  - Build times may be slower
- **Standard Plan**: Recommended for production
  - Always-on services
  - Better performance
  - More resources

## Next Steps

1. Set up custom domains (optional)
2. Configure persistent storage for file uploads
3. Set up monitoring and alerts
4. Consider upgrading plans for production use

## Support

- Render Documentation: https://render.com/docs
- Render Support: https://render.com/support
