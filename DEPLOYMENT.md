# 🚀 Production Deployment Guide — Mafia Game

This guide provides end-to-end instructions for deploying the **Mafia Game** full-stack application to production.

---

## 🏗️ Architecture Overview

| Component | Recommended Host | Runtime / Framework |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) / [Netlify](https://netlify.com) | Vite + React (SPA) |
| **Backend** | [Render](https://render.com) / [Railway](https://railway.app) / [Fly.io](https://fly.io) | Node.js + Express + Socket.IO |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | Cloud MongoDB |
| **Media Storage** | [Cloudinary](https://cloudinary.com) | Cloud Image CDN |

---

## 🔐 Environment Variables Reference

### 1. Backend (`backend/.env`)

Configure these variables in your backend hosting dashboard (e.g. Render/Railway):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | Port for the HTTP/Socket server *(auto-set by Render/Railway)* | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `DB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/mafia?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for JWT auth tokens | `a_very_long_secure_random_string_32chars` |
| `FRONTEND_URL` | Deployed URL of your frontend *(no trailing slash!)* | `https://mafia-game-aelh.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `your_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your_api_secret` |

---

### 2. Frontend (`frontend/.env`)

Configure these variables in your frontend hosting dashboard (e.g. Vercel/Netlify):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | Deployed backend server URL *(no trailing slash!)* | `https://mafia-game-backend.onrender.com` |
| `VITE_API_BASE_URL` | *(Optional)* Full API base URL *(defaults to `${VITE_BACKEND_URL}/api`)* | `https://mafia-game-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | *(Optional)* WebSocket URL *(defaults to `${VITE_BACKEND_URL}`)* | `https://mafia-game-backend.onrender.com` |

> [!NOTE]
> All Vite environment variables exposed to client-side code **MUST** start with `VITE_`.
> Trailing slashes are automatically handled by the centralized API config (`frontend/src/config/api.js`).

---

## 🛠️ Step 1: Deploying the Backend (e.g., Render)

1. **Sign in to [Render](https://render.com)** and click **New +** → **Web Service**.
2. **Connect your GitHub repository** containing `mafia-game`.
3. Configure the service settings:
   - **Name**: `mafia-game-backend`
   - **Root Directory**: `backend` *(crucial!)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add all **Environment Variables** listed in the Backend section above (`DB_URI`, `JWT_SECRET`, `FRONTEND_URL`, Cloudinary keys, `NODE_ENV=production`).
5. **MongoDB Atlas IP Whitelist (Important)**:
   - In your [MongoDB Atlas Dashboard](https://cloud.mongodb.com):
   - Go to **Network Access** → **IP Access List**.
   - Ensure `0.0.0.0/0` ("Allow Access from Anywhere") is added. Dynamic hosting platforms (Render, Railway, AWS) use shifting IP pools.
6. Click **Create Web Service**.
7. Once deployed, test the health check in your browser:
   ```
   https://<your-backend-app>.onrender.com/health
   ```
   You should receive `{ "status": "ok", "environment": "production", ... }`.

---

## ⚡ Step 2: Deploying the Frontend (e.g., Vercel)

1. **Sign in to [Vercel](https://vercel.com)** and click **Add New...** → **Project**.
2. **Import your repository**.
3. In the project setup:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and choose `frontend` *(crucial!)*
   - **Build Command**: `npm run build` *(auto-detected)*
   - **Output Directory**: `dist` *(auto-detected)*
4. Under **Environment Variables**, add:
   - `VITE_BACKEND_URL` = `https://<your-backend-app>.onrender.com`
5. Click **Deploy**.
6. **SPA Routing**:
   - `frontend/vercel.json` is already configured with rewrite rules so refreshing pages like `/lobby/:id`, `/game/:id`, and `/invite/:token` will work seamlessly without 404s.

---

## 🔄 Step 3: Final Linkage

1. Copy your live Vercel frontend URL (e.g., `https://mafia-game-aelh.vercel.app`).
2. Go back to your Backend on Render / Railway:
   - Verify `FRONTEND_URL` is set to that exact frontend URL (without trailing slash).
   - If changed, trigger a quick Redeploy.

---

## 🧪 Post-Deployment Verification Checklist

- [ ] Visit `https://<backend-url>/health` → returns `{"status":"ok"}`.
- [ ] Visit `https://<frontend-url>/` → landing page and auth screen load with horror atmosphere.
- [ ] Sign up new user and sign in → redirects to `/dashboard`.
- [ ] Create a room → redirects to `/lobby/<roomId>` and displays host controls.
- [ ] In another browser / incognito window, log in as second player and join room.
- [ ] Verify real-time player list updates via Socket.IO.
- [ ] Upload custom avatar in Profile → verified on Cloudinary CDN.
- [ ] Test invitation links: `/invite/<token>` loads invite preview and accept button.
