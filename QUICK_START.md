# 🚀 QUICK START - Get Running in 5 Minutes!

## ✅ Installation Complete!

Dependencies installed successfully with `npm install --legacy-peer-deps`

---

## 🎯 Choose Your Setup

### Option 1: Pinecone (Cloud - Recommended for Investors)

**Best for:** Investor demos, production, scalability

#### Step 1: Get Pinecone API Key
1. Go to: **https://www.pinecone.io/**
2. Sign up (FREE tier: 100K vectors)
3. Create a project
4. Copy your API key

#### Step 2: Set Environment Variables
```powershell
$env:PINECONE_API_KEY="pcsk_your-key-here"
$env:OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

#### Step 3: Run Example
```bash
npm run chat
```

---

### Option 2: Local Vector Store (No External DB)

**Best for:** Quick testing, no setup needed

#### Step 1: Set OpenRouter Key Only
```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

Get key from: https://openrouter.ai/keys

#### Step 2: Run Chat
```bash
npm run chat
```

The system will use local vector storage automatically!

---

## 💬 Test It Out

### Basic Conversation:
```
You: Hi, I'm Shivansh

AI: Hello Shivansh! How can I help you today?

🧠 Analyzing conversation...
⏭️  Skipped storage: Casual greeting
```

### Store Important Info:
```
You: I'm building Gigzs, a freelance marketplace for web developers

AI: That sounds like an exciting project! A freelance marketplace 
    focused on web developers can really help connect talented 
    developers with opportunities...

🧠 Analyzing conversation...
✅ Stored (project, importance: 90%)
📝 Contains project information
💡 Facts: Building Gigzs marketplace for web developers
```

### Test Memory Recall:
```
You: What am I working on?

🔍 Retrieving memories...
💭 (Used 2 memories from our past conversations)

AI: You're working on Gigzs, a freelance marketplace specifically 
    focused on web developers!
```

---

## 🎨 Available Commands

While chatting, you can use these commands:

- `/stats` - Show memory statistics
- `/memories` - View recent memories
- `/graph` - Show memory relationship graph
- `/help` - Show all commands
- `/exit` - Save and exit

---

## 📊 What's Working

### ✅ Implemented Features:
1. **Qwen 2.5 72B** - Premium AI model
2. **Smart AI Filtering** - AI decides what to store
3. **RAG System** - Retrieval-Augmented Generation
4. **Pinecone Integration** - Cloud vector database
5. **ChromaDB Support** - Local alternative
6. **Full CRUD** - Create, Read, Update, Delete
7. **Multi-User** - User-specific storage
8. **LangChain** - Production reliability

---

## 🐛 Troubleshooting

### "OPENROUTER_API_KEY not found"
```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

### "PINECONE_API_KEY not found" (if using Pinecone)
```powershell
$env:PINECONE_API_KEY="pcsk_your-key-here"
```

### Slow responses?
- Using Qwen 2.5 72B (premium model, slower but best quality)
- For faster responses, edit `src/cli/interactive-chat.ts` line 238:
  ```typescript
  'qwen/qwen-2.5-7b-instruct'  // Faster, still good quality
  ```

### Want to use ChromaDB instead?
1. Install ChromaDB:
   ```bash
   pip install chromadb
   ```
2. Start server:
   ```bash
   chroma run --host localhost --port 8000
   ```
3. Edit code to use `ChromaRAG` instead of `PineconeRAG`

---

## 📚 Next Steps

### For Testing:
1. ✅ Run `npm run chat`
2. ✅ Have a conversation
3. ✅ Test memory recall
4. ✅ Try commands (`/stats`, `/memories`)

### For Investor Demo:
1. ✅ Read `INVESTOR_PITCH_READY.md`
2. ✅ Practice demo script
3. ✅ Set up Pinecone (more professional)
4. ✅ Prepare talking points

### For Development:
1. ✅ Read `RAG_COMPLETE.md` - Full RAG system
2. ✅ Read `RAG_SETUP.md` - Setup details
3. ✅ Check `src/rag/` - RAG implementations

---

## 🎉 You're Ready!

**Start chatting:**
```bash
npm run chat
```

**With specific user:**
```bash
npm run chat shivansh
```

**Your AI with perfect memory is ready!** 🧠✨

---

## 💡 Pro Tips

### Tip 1: Test Smart Filtering
```
You: Hi                    → Skipped (casual)
You: My name is X          → Stored (personal)
You: I like TypeScript     → Stored (preference)
You: I'm building Y        → Stored (project)
```

### Tip 2: Test Memory Recall
```
You: What's my name?       → Uses stored memories
You: What am I building?   → Uses stored memories
You: What do I like?       → Uses stored memories
```

### Tip 3: Check Storage
```
You: /stats                → See total memories
You: /memories             → View recent ones
```

### Tip 4: Multi-User Testing
```bash
# User 1
npm run chat alice
You: I'm Alice, I like Python

# User 2
npm run chat bob
You: I'm Bob, I like JavaScript

# Memories are isolated! ✅
```

---

## 🚀 Ready for Investors?

**Read these:**
1. `INVESTOR_PITCH_READY.md` - Demo script
2. `RAG_COMPLETE.md` - Technical details
3. `FINAL_SUMMARY.md` - Complete overview

**Key selling points:**
- ✅ Production-grade RAG
- ✅ Cloud vector database
- ✅ Smart AI filtering
- ✅ Full CRUD operations
- ✅ Scalable architecture

**Good luck!** 💰🎯
