# Quick Start: Deploy to Render

## 🚀 Fast Deployment Steps

### 1. Prepare Your Code

All necessary files have been created. Make sure your code is committed:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy via Render Dashboard

#### Option A: Using Blueprint (Easiest)

1. Go to https://dashboard.render.com
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Click **"Apply"** to create both services

#### Option B: Manual Setup

**Backend Service:**

- New → Web Service
- Name: `smartcut-backend`
- Environment: Python 3
- Build: `pip install -r requirements.txt`
- Start: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend Service:**

- New → Web Service
- Name: `smartcut-frontend`
- Environment: Node
- Build: `npm install && VITE_API_URL=$VITE_API_URL npm run build && npm install -g serve`
- Start: `serve -s dist -l $PORT`

### 3. Configure Environment Variables

**Backend (`smartcut-backend`):**

- `OPENAI_API_KEY` - Your OpenAI API key (Required!)

**Frontend (`smartcut-frontend`):**

- `VITE_API_URL` - Set this to your backend URL (e.g., `https://smartcut-backend.onrender.com`)
  - ⚠️ **Important**: Set this AFTER the backend deploys, then trigger a rebuild

### 4. Wait for Deployment

- Backend will deploy first
- Note the backend URL
- Set `VITE_API_URL` in frontend service
- Frontend will rebuild and deploy

### 5. Test

- Backend: `https://your-backend.onrender.com` - Should show `{"message":"Smart Cut API is running!"}`
- Frontend: `https://your-frontend.onrender.com` - Your app should load!

## 📝 Important Notes

- **Free tier services spin down after inactivity** - First request after idle may be slow
- **File uploads are temporary** - Files are deleted on service restart (ephemeral storage)
- **FFmpeg should be available** - If not, contact Render support

## 🔧 Troubleshooting

**Frontend can't connect to backend:**

- Check `VITE_API_URL` is set correctly
- Rebuild frontend after setting the variable
- Check CORS settings in backend

**Build fails:**

- Check logs in Render dashboard
- Verify all dependencies are in `requirements.txt` and `package.json`

**FFmpeg errors:**

- FFmpeg should be pre-installed on Render
- If missing, contact Render support

## 📚 Full Documentation

See `RENDER_DEPLOYMENT.md` for detailed instructions.
