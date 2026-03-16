<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://aistudio-preprod.corp.google.com/apps/8555038f-e67a-45a9-b9db-5b9a5531632b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
4. Optional (recommended for multi-device use): set `AUTOMATION_WEBHOOK_URL` in your deployment environment (e.g., Vercel Project Settings → Environment Variables) so "Send to Sheet" works without per-browser setup.

5. Use the deployed Web App URL format: `https://script.google.com/macros/s/.../exec` (not `/a/macros/...`).

6. For automated posts from Vercel/server, set Apps Script Web App access to `Anyone` (anonymous) when possible; `Anyone with Google Account` can still require sign-in and fail from server-side calls.
