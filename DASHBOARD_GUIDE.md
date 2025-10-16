# 📊 Kanban Dashboard - Live Memory Visualization

## ✅ What You Have

### 1. **Kanban Board**
- Visual columns for each category (Personal, Preferences, Projects, Q&A, General)
- Drag-and-drop style cards
- Color-coded by category
- Shows importance scores

### 2. **Memory Graph**
- Node & edge visualization
- Shows relationships between memories
- Color-coded nodes by category
- Interactive canvas

### 3. **Live Stats**
- Total memories
- Average importance
- Active categories
- Connection count

### 4. **Real-Time Updates**
- Auto-refresh every 10 seconds
- Manual refresh button
- Live data from Pinecone

---

## 🚀 How to Use

### Step 1: Start the Dashboard Server

```bash
# Terminal 1: Start dashboard
npm run dashboard
```

**Output:**
```
🚀 Starting Memory Dashboard Server...

✅ Pinecone RAG initialized for dashboard

╔════════════════════════════════════════════════════════╗
║     🧠 SUPERMEMORY DASHBOARD - LIVE VISUALIZATION     ║
╚════════════════════════════════════════════════════════╝

📊 Dashboard: http://localhost:3000
🔌 API: http://localhost:3000/api/memories

Press Ctrl+C to stop
```

### Step 2: Open Dashboard in Browser

Open: **http://localhost:3000**

### Step 3: Chat in Another Terminal

```bash
# Terminal 2: Chat with AI
npm run chat
```

Have conversations, and watch them appear in the dashboard!

---

## 🎨 Dashboard Features

### Kanban Board View

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 👤 Personal │ ⭐ Prefs    │ 🚀 Projects │ ❓ Q&A      │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ My name is  │ I prefer TS │ Building    │ What is...  │
│ Shivansh    │ over JS     │ Gigzs       │             │
│             │             │             │             │
│ [90%]       │ [80%]       │ [90%]       │ [70%]       │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Memory Graph

```
    (Personal)
        │
        ├──────(Project)
        │          │
    (Preference)   │
        │          │
        └──────(Question)
```

**Color Legend:**
- 🔵 Personal (Blue)
- 🟣 Preference (Purple)
- 🔷 Project (Light Blue)
- 🟢 Question (Green)
- 🟠 General (Orange)

---

## 🎯 Use Cases

### For Investor Demo:

1. **Start dashboard** → Show professional UI
2. **Have conversation** → Watch memories appear live
3. **Show categories** → Demonstrate smart filtering
4. **Show graph** → Visualize relationships
5. **Show stats** → Prove scalability

### For Development:

1. **Debug storage** → See what's actually stored
2. **Test categories** → Verify AI classification
3. **Check importance** → See scoring in action
4. **Monitor growth** → Track memory accumulation

### For Analysis:

1. **Export data** → Download as JSON
2. **View patterns** → See conversation themes
3. **Track usage** → Monitor memory growth
4. **Audit quality** → Review stored content

---

## 📊 Dashboard Controls

### Buttons:

| Button | Function |
|--------|----------|
| 🔄 Refresh | Manually reload memories |
| ⏱️ Auto-Refresh | Toggle auto-refresh (every 5s) |
| 📥 Export JSON | Download all memories as JSON |

### Stats Cards:

| Stat | Description |
|------|-------------|
| **Total Memories** | Count of all stored memories |
| **Avg Importance** | Average importance score (0-100%) |
| **Categories** | Number of active categories |
| **Connections** | Estimated relationships |

---

## 🔌 API Endpoints

### GET `/api/memories`

Returns all memories grouped by category.

**Response:**
```json
{
  "success": true,
  "total": 10,
  "memories": {
    "personal": [
      {
        "id": "abc123",
        "content": "My name is Shivansh",
        "category": "personal",
        "importance": 0.9,
        "timestamp": 1697456789000,
        "userId": "default-user"
      }
    ],
    "project": [...],
    "preference": [...],
    "question": [...],
    "general": [...]
  }
}
```

### GET `/api/stats`

Returns Pinecone index statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalVectors": 10,
    "dimension": 384,
    "indexName": "supermemory"
  }
}
```

---

## 🎨 Customization

### Change Colors

Edit `src/web/memory-dashboard-live.html`:

```css
/* Line ~150 */
.column-personal .column-header { 
  border-color: #YOUR_COLOR; 
  color: #YOUR_COLOR; 
}
```

### Change Refresh Rate

Edit `src/web/memory-dashboard-live.html`:

```javascript
// Line ~450
setInterval(loadMemories, 10000);  // 10 seconds
// Change to:
setInterval(loadMemories, 5000);   // 5 seconds
```

### Change Port

Edit `src/web/server.ts`:

```typescript
// Line 13
const PORT = 3000;
// Change to:
const PORT = 8080;
```

---

## 🐛 Troubleshooting

### "Pinecone not initialized"

**Cause:** No PINECONE_API_KEY set

**Fix:**
```bash
$env:PINECONE_API_KEY="your-key"
npm run dashboard
```

### "Failed to load memories"

**Cause:** Dashboard server not running

**Fix:**
```bash
npm run dashboard
```

### "No memories to visualize"

**Cause:** No conversations yet

**Fix:**
```bash
# In another terminal
npm run chat
# Have a conversation
```

### Dashboard not updating

**Cause:** Auto-refresh disabled

**Fix:**
- Click "🔄 Refresh" button
- Or click "⏱️ Auto-Refresh" to enable

---

## 🎉 Demo Flow

### Perfect Investor Demo:

**Terminal 1:**
```bash
npm run dashboard
```

**Browser:**
Open http://localhost:3000

**Terminal 2:**
```bash
npm run chat

You: My name is Shivansh
You: I'm building Gigzs marketplace
You: I prefer TypeScript
```

**Show in Dashboard:**
1. ✅ Memories appear in real-time
2. ✅ Categorized automatically
3. ✅ Importance scores shown
4. ✅ Graph visualizes relationships
5. ✅ Stats update live

**Key Points:**
- "See how memories are categorized automatically"
- "Notice the importance scores"
- "Graph shows relationships between memories"
- "All stored in Pinecone cloud"
- "Scales to millions of memories"

---

## 📁 Files

| File | Purpose |
|------|---------|
| `src/web/server.ts` | HTTP server + API |
| `src/web/memory-dashboard-live.html` | Live dashboard UI |
| `src/web/memory-dashboard.html` | Static demo (sample data) |

---

## 🚀 Quick Start

```bash
# Terminal 1: Dashboard
$env:PINECONE_API_KEY="your-key"
npm run dashboard

# Terminal 2: Chat
npm run chat

# Browser: Open http://localhost:3000
```

**Your live Kanban dashboard is ready!** 📊✨

---

## 💡 Pro Tips

### Tip 1: Use Two Monitors
- Monitor 1: Dashboard (http://localhost:3000)
- Monitor 2: Chat terminal
- Watch memories appear live!

### Tip 2: Export for Analysis
- Click "📥 Export JSON"
- Analyze in Excel/Python
- Track patterns over time

### Tip 3: Auto-Refresh for Demos
- Click "⏱️ Auto-Refresh"
- Dashboard updates every 5 seconds
- Perfect for live demos

### Tip 4: Full Screen for Presentations
- Press F11 in browser
- Hide terminal windows
- Professional presentation mode

---

**Your Kanban dashboard with live visualization is ready!** 🎨📊
