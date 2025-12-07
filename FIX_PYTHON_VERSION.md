# Fix Python Version Deployment Issue

## Problem

Deployment is failing with pandas compilation errors because Python 3.13.0 is being used instead of Python 3.12.0. Even though `render.yaml` specifies Python 3.12.0, Render dashboard environment variables can override this setting.

## Error Symptoms

- Build logs show: `==> Installing Python version 3.13.0...`
- pandas compilation fails with: `error: standard attributes in middle of decl-specifiers`
- Error occurs during: `Preparing metadata (pyproject.toml)` for pandas==2.2.2

## Root Cause

Render.com environment variables set in the dashboard UI take precedence over `render.yaml` settings. If `PYTHON_VERSION` is set to `3.13.0` in the dashboard, it will override the `3.12.0` value in `render.yaml`.

## Solution: Update Render Dashboard

### Step 1: Access Render Dashboard

1. Go to https://dashboard.render.com
2. Log in to your account
3. Navigate to your **smartcut-backend** service

### Step 2: Check Environment Variables

1. Click on the **smartcut-backend** service
2. Go to the **"Environment"** tab in the left sidebar
3. Look for `PYTHON_VERSION` in the environment variables list

### Step 3: Update or Add PYTHON_VERSION

**If PYTHON_VERSION exists:**

- Click on the `PYTHON_VERSION` variable
- Change the value from `3.13.0` to `3.12.0`
- Click **"Save Changes"**

**If PYTHON_VERSION does NOT exist:**

- Click **"Add Environment Variable"**
- Key: `PYTHON_VERSION`
- Value: `3.12.0`
- Click **"Save Changes"**

### Step 4: Trigger New Deployment

1. After saving, Render should automatically trigger a new deployment
2. If not, go to the **"Manual Deploy"** tab and click **"Deploy latest commit"**
3. Watch the build logs to verify:
   - You should see: `==> Installing Python version 3.12.0...` (NOT 3.13.0)
   - pandas should compile successfully
   - Build should complete without errors

## Verification

After the fix, your deployment logs should show:

```
==> Installing Python version 3.12.0...
==> Using Python version 3.12.0 via environment variable PYTHON_VERSION
...
Collecting pandas==2.2.2
...
Preparing metadata (pyproject.toml): finished with status 'done'
...
Successfully installed pandas-2.2.2
```

## Why Python 3.12.0?

- pandas 2.2.2 does not support Python 3.13.0
- pandas 2.2.2 supports Python 3.9-3.12
- Python 3.12.0 is the latest supported version for pandas 2.2.2
- This ensures all dependencies (numpy, scipy, pandas, etc.) compile successfully

## Additional Notes

- The `render.yaml` file is already correctly configured with `PYTHON_VERSION: 3.12.0`
- If you're using Blueprint deployment, the dashboard environment variable will still override `render.yaml`
- Always check the dashboard environment variables if `render.yaml` changes aren't taking effect

## Still Having Issues?

If the problem persists after updating the dashboard:

1. **Verify the change took effect:**

   - Check the build logs for the Python version being installed
   - Should show 3.12.0, not 3.13.0

2. **Clear Render cache:**

   - In Render dashboard, try "Clear build cache" option
   - Then trigger a new deployment

3. **Check for multiple PYTHON_VERSION entries:**

   - Make sure there's only one `PYTHON_VERSION` variable
   - Remove any duplicates

4. **Verify render.yaml is being used:**
   - If service was created manually (not from Blueprint), it might not use `render.yaml`
   - In that case, you must set `PYTHON_VERSION` in the dashboard
