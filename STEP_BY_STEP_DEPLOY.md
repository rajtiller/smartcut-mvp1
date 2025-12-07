# Step-by-Step Render Deployment Guide

## Prerequisites ✅

Before starting, make sure you have:

- [ ] A Render account (sign up at https://render.com - it's free)
- [ ] Your OpenAI API key (get it from https://platform.openai.com/api-keys)
- [ ] Your code pushed to GitHub (already done! ✅)

---

## Part 1: Deploy the Backend (Start Here!)

### Step 1: Log into Render

1. Go to https://dashboard.render.com
2. Log in (or sign up if you don't have an account)

### Step 2: Create a New Blueprint

**Option A: Using Blueprint (Recommended - Deploys Both Services)**

1. Click the **"New +"** button (top right)
2. Select **"Blueprint"** from the dropdown menu
3. You'll see a screen asking you to connect a repository

### Step 3: Connect Your GitHub Repository

1. Click **"Connect account"** (if you haven't connected GitHub yet)
   - Authorize Render to access your GitHub repositories
2. After connecting, you'll see your repositories listed
3. Find and click on **"rajtiller/smartcut-mvp1"** (or your repo name)
4. Render will show you the repository details
5. Make sure **Branch** is set to **"master"** (your code is on master, not main)
6. Click **"Apply"** or **"Create Blueprint"**

### Step 4: Review Services

Render will read your `render.yaml` file and show you two services it will create:

- ✅ **smartcut-backend** (Python Web Service)
- ✅ **smartcut-frontend** (Node Web Service)

You can see the configuration for each. Click **"Apply"** to continue.

### Step 5: Wait for Backend to Build

1. Render will start building both services
2. **Focus on the backend first** - watch the `smartcut-backend` service
3. Click on **"smartcut-backend"** to see its build logs
4. You'll see logs like:
   ```
   ==> Building...
   pip install -r requirements.txt
   ==> Starting...
   ```

### Step 6: Add OpenAI API Key

**IMPORTANT:** The backend will fail to start without this!

1. While the backend is building, click on **"smartcut-backend"** service
2. Go to the **"Environment"** tab (left sidebar)
3. Click **"Add Environment Variable"** or **"Add Secret"**
4. Add:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Paste your OpenAI API key (it starts with `sk-...`)
   - ✅ Check **"Secret"** checkbox (so it's hidden)
5. Click **"Save Changes"**

### Step 7: Wait for Backend to Deploy

1. After adding the API key, Render will automatically redeploy
2. Watch the logs - you should see:
   ```
   INFO:     Started server process
   INFO:     Uvicorn running on http://0.0.0.0:xxxx
   ```
3. Wait until status shows **"Live"** ✅ (green indicator)

### Step 8: Get Your Backend URL

1. When the backend is **Live**, look at the top of the service page
2. You'll see a URL like:
   ```
   https://smartcut-backend.onrender.com
   ```
3. **Copy this URL** - you'll need it for the frontend!
4. Test it: Click the URL or visit it in your browser
   - You should see: `{"message":"Smart Cut API is running!"}`
   - Or visit: `https://smartcut-backend.onrender.com/docs` for API documentation

**✅ Backend is now deployed!**

---

## Part 2: Deploy the Frontend

### Step 9: Configure Frontend Environment Variable

1. Go to the **"smartcut-frontend"** service (it might still be building/queued)
2. Click on **"smartcut-frontend"**
3. Go to the **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: Your backend URL from Step 8 (e.g., `https://smartcut-backend.onrender.com`)
   - ⚠️ **IMPORTANT**: Don't add a trailing slash! Use `https://smartcut-backend.onrender.com` NOT `https://smartcut-backend.onrender.com/`
6. Click **"Save Changes"**

### Step 10: Trigger Frontend Rebuild (if needed)

1. If the frontend already built without the `VITE_API_URL`, you need to rebuild:
   - Go to **"Manual Deploy"** tab
   - Click **"Deploy latest commit"**
2. OR wait for auto-redeploy after saving the environment variable

### Step 11: Wait for Frontend to Deploy

1. Watch the build logs
2. You should see:
   ```
   npm install
   VITE_API_URL=https://smartcut-backend.onrender.com npm run build
   npm install -g serve
   ```
3. Wait until status shows **"Live"** ✅

### Step 12: Get Your Frontend URL

1. When frontend is **Live**, look at the top of the service page
2. You'll see a URL like:
   ```
   https://smartcut-frontend.onrender.com
   ```
3. **Visit this URL** - your app should be working! 🎉

---

## Alternative: Deploy Services Manually (One at a Time)

If you prefer to deploy manually or the Blueprint doesn't work:

### Deploy Backend Manually:

1. **Create New Web Service**

   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository

2. **Configure Service**

   - **Name**: `smartcut-backend`
   - **Environment**: `Python 3`
   - **Region**: Choose closest to you
   - **Branch**: `master`
   - **Root Directory**: Leave blank (or set to `/`)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free` (or Starter)

3. **Add Environment Variables**

   - `PYTHON_VERSION`: `3.12.0` (Required for pandas compatibility)
   - `OPENAI_API_KEY`: Your API key (mark as Secret)

4. **Create Service**
   - Click **"Create Web Service"**
   - Wait for deployment
   - Copy the URL when Live

### Deploy Frontend Manually:

1. **Create New Web Service**

   - Click **"New +"** → **"Web Service"**
   - Connect the same GitHub repository

2. **Configure Service**

   - **Name**: `smartcut-frontend`
   - **Environment**: `Node`
   - **Region**: Same as backend
   - **Branch**: `master`
   - **Root Directory**: Leave blank
   - **Build Command**: `npm install && VITE_API_URL=$VITE_API_URL npm run build && npm install -g serve`
   - **Start Command**: `serve -s dist -l $PORT`
   - **Plan**: `Free` (or Starter)

3. **Add Environment Variables**

   - `NODE_VERSION`: `18.17.0`
   - `VITE_API_URL`: Your backend URL (e.g., `https://smartcut-backend.onrender.com`)

4. **Create Service**
   - Click **"Create Web Service"**
   - Wait for deployment
   - Copy the URL when Live

---

## Troubleshooting

### Backend won't start

- ✅ Check that `OPENAI_API_KEY` is set
- ✅ Check the logs for errors
- ✅ Make sure Python version matches (3.13.0)

### Frontend shows connection errors

- ✅ Check that `VITE_API_URL` is set correctly (no trailing slash)
- ✅ Make sure backend is Live first
- ✅ Rebuild frontend after setting `VITE_API_URL`

### Build fails

- ✅ Check logs for specific errors
- ✅ Make sure all dependencies are in `requirements.txt` and `package.json`
- ✅ Try manual rebuild from "Manual Deploy" tab

### Services spin down (Free tier)

- ✅ This is normal on free tier - first request after inactivity takes ~30 seconds
- ✅ Upgrade to paid plan for always-on services

---

## Quick Checklist

### Backend ✅

- [ ] Created service
- [ ] Added `OPENAI_API_KEY` environment variable
- [ ] Service is Live
- [ ] URL works (shows JSON message)

### Frontend ✅

- [ ] Created service
- [ ] Added `VITE_API_URL` environment variable (with backend URL)
- [ ] Service is Live
- [ ] App loads in browser

---

## Next Steps

1. Test uploading a video file
2. Monitor logs for any errors
3. Consider upgrading plan for production use
4. Set up custom domain (optional)

---

## Summary

**Deployment Flow:**

1. Push code to GitHub ✅ (already done)
2. Create Blueprint in Render OR create services manually
3. Set `OPENAI_API_KEY` in backend
4. Wait for backend to be Live → Get backend URL
5. Set `VITE_API_URL` in frontend (use backend URL)
6. Wait for frontend to be Live
7. Test your app! 🎉
