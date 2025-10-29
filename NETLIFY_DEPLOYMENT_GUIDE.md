# 🚀 Netlify Deployment Guide - Complete Setup

## ✅ What You Now Have

### Single Command Local Development
```bash
npm run web
# or
npm run dashboard
```

**Both serve on same port (3000) with different routes:**
- `http://localhost:3000/` → Chat UI
- `http://localhost:3000/dashboard` → Memory Dashboard

### Netlify-Ready Files
- ✅ `src/web/index.html` - Chat frontend
- ✅ `src/web/memory-dashboard-live.html` - Dashboard (updated for Netlify)
- ✅ `netlify/functions/chat.ts` - Chat API
- ✅ `netlify/functions/memories.ts` - Memories API
- ✅ `netlify/functions/stats.ts` - Stats API
- ✅ `netlify.toml` - Netlify configuration

---

## 🔧 Local Development (No More Terminal Exports!)

### Option 1: Use .env file (Recommended)
```bash
# 1. Copy example to .env
copy .env.example .env

# 2. Edit .env and add your keys:
OPENROUTER_API_KEY=sk-or-v1-your-key-here
PINECONE_API_KEY=pcsk_your-key-here

# 3. Install dotenv
npm install dotenv

# 4. Run (will auto-load .env)
npm run web
```

### Option 2: PowerShell exports (Current way)
```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-your-key"
$env:PINECONE_API_KEY="pcsk_your-key"
npm run web
```

### What You Get Locally:
- `http://localhost:3000/` → Chat interface
- `http://localhost:3000/dashboard` → Live dashboard
- Both use same server, same port!

---

## 🌐 Netlify Deployment Steps

### Step 1: Push to Git
```bash
git add .
git commit -m "Add Netlify deployment files"
git push origin main
```

### Step 2: Create Netlify Site
1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. **Build settings:**
   - Build command: `npm install`
   - Publish directory: `src/web`
   - Functions directory: `netlify/functions`

### Step 3: Set Environment Variables
In Netlify Dashboard → Site settings → Environment variables:

**Required:**
- `OPENROUTER_API_KEY` = `sk-or-v1-your-key-here`
- `PINECONE_API_KEY` = `pcsk_your-key-here`

**Optional:**
- `OPENAI_API_KEY` = `your-openai-key`
- `ANTHROPIC_API_KEY` = `your-anthropic-key`
- `SUPERMEMORY_EMBEDDING_MODEL` = `Xenova/all-MiniLM-L6-v2`

### Step 4: Deploy
Click "Deploy site" - Netlify will:
1. Run `npm install`
2. Serve files from `src/web/`
3. Deploy functions to `/.netlify/functions/`

### Step 5: Test Your Site
Your site will be at: `https://your-site-name.netlify.app`

**URLs:**
- `https://your-site-name.netlify.app/` → Chat
- `https://your-site-name.netlify.app/memory-dashboard-live.html` → Dashboard

---

## 🎯 How It Works

### Local Development:
```
npm run web
├── Serves src/web/index.html at /
├── Serves src/web/memory-dashboard-live.html at /dashboard
├── API at /api/chat (POST)
├── API at /api/memories (GET)
└── API at /api/stats (GET)
```

### Netlify Production:
```
https://your-site.netlify.app/
├── Serves src/web/index.html at /
├── Serves src/web/memory-dashboard-live.html
├── /.netlify/functions/chat (POST)
├── /.netlify/functions/memories (GET)
└── /.netlify/functions/stats (GET)
```

### Smart URL Detection:
The frontend automatically detects:
- **Local:** Calls `http://localhost:3000/api/...`
- **Netlify:** Calls `/.netlify/functions/...`

---

## 🔍 Testing

### Local Test:
```bash
npm run web
# Open http://localhost:3000
# Open http://localhost:3000/dashboard
```

### Netlify Test:
1. Deploy to Netlify
2. Open your Netlify URL
3. Test chat functionality
4. Navigate to `/memory-dashboard-live.html`

---

## 📁 File Structure

```
windsurf-project/
├── src/web/
│   ├── index.html                    # Chat UI
│   ├── memory-dashboard-live.html    # Dashboard
│   └── server.ts                     # Local development server
├── netlify/
│   └── functions/
│       ├── chat.ts                   # Chat API
│       ├── memories.ts               # Memories API
│       └── stats.ts                  # Stats API
├── netlify.toml                      # Netlify config
└── package.json                      # Updated scripts
```

---

## 🎨 Features

### Chat Interface (`/`)
- Clean, modern UI
- Real-time messaging
- Conversation history
- Memory usage indicators
- Navigation to dashboard

### Dashboard (`/memory-dashboard-live.html`)
- Kanban board visualization
- Memory graph (improved circular layout)
- Live statistics
- Auto-refresh
- Professional design (no emojis)

### APIs
- **POST** `/.netlify/functions/chat` - Send messages
- **GET** `/.netlify/functions/memories` - Get all memories
- **GET** `/.netlify/functions/stats` - Get Pinecone stats

---

## 🐛 Troubleshooting

### Local Issues:

**"Missing PINECONE_API_KEY"**
```bash
# Option 1: Use .env
echo "PINECONE_API_KEY=pcsk_your-key" >> .env

# Option 2: Export in terminal
$env:PINECONE_API_KEY="pcsk_your-key"
```

**"Port already in use"**
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Netlify Issues:

**"Function failed"**
1. Check Netlify function logs
2. Verify environment variables are set
3. Check API keys are valid

**"Site not loading"**
1. Check build logs in Netlify
2. Verify `src/web` contains HTML files
3. Check `netlify.toml` configuration

---

## 💡 Pro Tips

### Development Workflow:
```bash
# 1. Local development
npm run web

# 2. Test both interfaces
# - Chat: http://localhost:3000/
# - Dashboard: http://localhost:3000/dashboard

# 3. Push to Git
git add . && git commit -m "Update" && git push

# 4. Netlify auto-deploys
```

### Environment Management:
- **Local:** Use `.env` file (never commit this!)
- **Netlify:** Set in dashboard (persists across deploys)
- **Team:** Share `.env.example` with key names

### Monitoring:
- **Netlify:** Check function logs for errors
- **Local:** Check terminal output
- **Browser:** Check Network tab for API calls

---

## 🎉 Success Checklist

### Local Development:
- [ ] `npm run web` starts server
- [ ] Chat works at `http://localhost:3000/`
- [ ] Dashboard works at `http://localhost:3000/dashboard`
- [ ] No need to export env vars (using .env)

### Netlify Deployment:
- [ ] Site builds successfully
- [ ] Environment variables set
- [ ] Chat interface loads
- [ ] Dashboard loads
- [ ] API functions work
- [ ] Memories persist

---

## 🚀 You're Ready!

**Local Command:**
```bash
npm run web
```

**Netlify URLs:**
- Chat: `https://your-site.netlify.app/`
- Dashboard: `https://your-site.netlify.app/memory-dashboard-live.html`

**No more terminal exports after deployment!** 🎊

---

## 📞 Need Help?

### Common Commands:
```bash
# Start local development
npm run web

# Check if port is free
netstat -ano | findstr :3000

# View environment variables
echo $env:PINECONE_API_KEY
```

### Useful Links:
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Pinecone Dashboard](https://app.pinecone.io/)
- [OpenRouter Dashboard](https://openrouter.ai/keys)

**Your full-stack AI chat with memory is ready for production!** ✨
