# 🎮 Interactive Chat Guide

## 🎯 What You Asked For - Now Implemented!

### ✅ 1. Interactive Chat (Not Hardcoded!)
You can now chat with the AI in real-time. It remembers everything!

### ✅ 2. Real LLM Integration
Multiple LLM providers ready to use:
- OpenAI (GPT-3.5, GPT-4)
- Ollama (100% FREE, runs locally!)
- Google Gemini (FREE API)

### ✅ 3. Smart Memory Management
- LLM decides what to store
- Automatic deduplication
- Relationship detection

### ✅ 4. Memory Graph & Relationships
- Detects similar conversations
- Merges related memories
- Creates memory relationships

---

## 🚀 Quick Start

### Option 1: With Mock LLM (No Setup Required)

```bash
npm run chat
```

This works immediately! The AI will remember everything you say.

### Option 2: With Real LLM (Ollama - FREE!)

#### Step 1: Install Ollama
```bash
# Download from: https://ollama.ai
# Or use: curl https://ollama.ai/install.sh | sh
```

#### Step 2: Pull a Model
```bash
ollama pull llama2
# Or try: mistral, codellama, phi, etc.
```

#### Step 3: Start Ollama
```bash
ollama serve
```

#### Step 4: Update Interactive Chat
Edit `src/cli/interactive-chat.ts` line 221:

```typescript
// Replace:
orchestrator.setLLMProvider(new MockLLM());

// With:
import { OllamaProvider } from '../providers/OllamaProvider.js';
orchestrator.setLLMProvider(new OllamaProvider('llama2'));
```

#### Step 5: Chat!
```bash
npm run chat
```

### Option 3: With OpenAI

#### Step 1: Get API Key
Get your key from: https://platform.openai.com/api-keys

#### Step 2: Set Environment Variable
```bash
# Windows
set OPENAI_API_KEY=sk-your-key-here

# Mac/Linux
export OPENAI_API_KEY=sk-your-key-here
```

#### Step 3: Update Interactive Chat
Edit `src/cli/interactive-chat.ts` line 221:

```typescript
import { OpenAIProvider } from '../providers/OpenAIProvider.js';
orchestrator.setLLMProvider(
  new OpenAIProvider(process.env.OPENAI_API_KEY!, 'gpt-3.5-turbo')
);
```

#### Step 4: Chat!
```bash
npm run chat
```

---

## 💬 How to Use Interactive Chat

### Start Chatting
```bash
npm run chat
```

You'll see:
```
🤖 Welcome to Supermemory Interactive Chat!

💡 I remember everything we discuss. Try asking me about our past conversations!

Commands:
  - Type your message to chat
  - /stats - Show memory statistics
  - /memories - Show recent memories
  - /graph - Show memory relationships
  - /clear - Clear all memories
  - /exit - Exit chat

────────────────────────────────────────────────────────────

You: 
```

### Example Conversation

```
You: My name is Shivansh and I'm building Gigzs

🤔 Thinking...

🤖 AI: I understand you said: "My name is Shivansh and I'm building Gigzs". 
       I'll remember this for our future conversations!

💭 (Used 0 memories from our past conversations)

📝 Remembered: My name is Shivansh, I'm building Gigzs

────────────────────────────────────────────────────────────

You: What's my name?

🤔 Thinking...

🤖 AI: Based on what I remember (1 memories), your name is Shivansh!

💭 (Used 1 memories from our past conversations)

────────────────────────────────────────────────────────────

You: What am I working on?

🤔 Thinking...

🤖 AI: Based on what I remember (1 memories), you're building Gigzs!

💭 (Used 1 memories from our past conversations)

────────────────────────────────────────────────────────────
```

### Commands

#### `/stats` - Memory Statistics
```
You: /stats

📊 Memory Statistics:
   Total Memories: 15
   Vector Dimension: 384
   Storage Path: ./data/interactive-chat
```

#### `/memories` - Recent Memories
```
You: /memories

📚 Recent Memories:

1. [16/10/2025, 1:30:00 pm] My name is Shivansh and I'm building Gigzs
2. [16/10/2025, 1:31:00 pm] I prefer TypeScript over JavaScript
3. [16/10/2025, 1:32:00 pm] My budget range is $500-$1000
...
```

#### `/graph` - Memory Relationships
```
You: /graph

🕸️  Analyzing memory relationships...

Nodes (Memories): 15
Edges (Relationships): 8

Top Relationships:
1. "My name is Shivansh..." ↔ "I'm building Gigzs..."
   Strength: 87.3%

2. "I prefer TypeScript..." ↔ "I'm learning React..."
   Strength: 76.5%
```

#### `/exit` - Save and Exit
```
You: /exit

👋 Saving memories and exiting...

✅ Goodbye!
```

---

## 🧠 Smart Memory Features

### 1. Automatic Deduplication

If you say the same thing twice, it won't store duplicates:

```
You: I love pizza
AI: Got it! I'll remember that.

You: I love pizza
AI: I already know that! (Not storing duplicate)
```

### 2. Update Detection

If you update information, it creates a relationship:

```
You: My favorite color is blue
AI: Remembered!

You: Actually, my favorite color is red now
AI: Updated! I'll remember the new preference and keep the old one for context.
```

### 3. Relationship Detection

Related memories are automatically linked:

```
You: I'm working on a React project
AI: Noted!

You: I'm using TypeScript for my project
AI: I see this is related to your React project! Linking these memories.
```

### 4. Smart Storage

The LLM decides what's worth remembering:

```
You: Hello!
AI: Hi! (Not storing - just a greeting)

You: My birthday is March 15th
AI: Happy early birthday! (Storing - important personal info)
```

---

## 🔧 Customization

### Change LLM Provider

Edit `src/cli/interactive-chat.ts`:

```typescript
// Ollama (FREE, local)
import { OllamaProvider } from '../providers/OllamaProvider.js';
orchestrator.setLLMProvider(new OllamaProvider('llama2'));

// OpenAI
import { OpenAIProvider } from '../providers/OpenAIProvider.js';
orchestrator.setLLMProvider(
  new OpenAIProvider(process.env.OPENAI_API_KEY!, 'gpt-4')
);

// Gemini (FREE API)
import { GeminiProvider } from '../providers/GeminiProvider.js';
orchestrator.setLLMProvider(
  new GeminiProvider(process.env.GEMINI_API_KEY!)
);
```

### Change User ID

```bash
# Default user
npm run chat

# Specific user
npm run chat:user user123
```

### Change Storage Path

Edit `src/cli/interactive-chat.ts` line 214:

```typescript
const memory = new Supermemory({
  storagePath: './data/my-custom-path'
});
```

### Adjust Memory Retrieval

Edit line 95 in `interactive-chat.ts`:

```typescript
const result = await this.orchestrator.processQuery(userInput, {
  memoryTopK: 10,  // Retrieve more memories
  threshold: 0.7,  // Minimum similarity
  // ...
});
```

---

## 🎯 Real-World Examples

### Example 1: Personal Assistant

```
You: I have a meeting with John tomorrow at 3pm
AI: Got it! I'll remember your meeting with John.

You: What meetings do I have tomorrow?
AI: You have a meeting with John at 3pm tomorrow.
```

### Example 2: Project Tracker

```
You: I'm working on the authentication feature for Gigzs
AI: Noted! Working on authentication for Gigzs.

You: What features am I working on?
AI: You're working on the authentication feature for Gigzs.
```

### Example 3: Preference Learning

```
You: I prefer dark mode
AI: Remembered your preference for dark mode!

You: I like email notifications
AI: Noted! You prefer email notifications.

You: What are my preferences?
AI: Based on what I remember:
    - You prefer dark mode
    - You like email notifications
```

---

## 🐛 Troubleshooting

### Issue: "Ollama API error"

**Solution:**
```bash
# Make sure Ollama is running
ollama serve

# In another terminal
ollama pull llama2
```

### Issue: "OpenAI API error"

**Solution:**
```bash
# Check your API key
echo $OPENAI_API_KEY  # Mac/Linux
echo %OPENAI_API_KEY%  # Windows

# Make sure it starts with sk-
```

### Issue: Slow responses

**Solution:**
- First query loads the embedding model (~2-3 seconds)
- Subsequent queries are fast
- Ollama models vary in speed (llama2 is fast, llama3 is slower but better)

### Issue: Memory not persisting

**Solution:**
```
# Always exit with /exit command to save memories
You: /exit

# Or manually save in code:
await orchestrator.save();
```

---

## 📊 Performance Tips

### 1. Use Appropriate topK

```typescript
// Fast but less context
memoryTopK: 3

// Balanced (recommended)
memoryTopK: 5

// Slow but maximum context
memoryTopK: 20
```

### 2. Filter by User

```typescript
memoryFilter: { userId: 'specific-user' }
```

### 3. Use Threshold

```typescript
threshold: 0.8  // Only high-confidence memories
```

---

## 🎉 You're Ready!

Now you have:
- ✅ **Interactive chat** - Talk to AI in real-time
- ✅ **Real LLM integration** - Multiple providers ready
- ✅ **Smart memory** - Deduplication & relationships
- ✅ **Memory graph** - See how memories connect
- ✅ **Persistent storage** - Everything saved

**Start chatting:**
```bash
npm run chat
```

**With Ollama (FREE):**
```bash
ollama serve  # Terminal 1
npm run chat  # Terminal 2
```

Enjoy your AI with infinite memory! 🧠✨
