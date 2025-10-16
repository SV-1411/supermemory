# ❓ Frequently Asked Questions

## Q1: Where is everything getting stored?

### 📁 Storage Location

**Default Path:** `./data/`

All memories are stored in:
```
windsurf-project/
└── data/
    ├── interactive-chat/
    │   └── memories.json          # All your memories stored here!
    ├── simple-demo/
    │   └── memories.json
    ├── demo/
    │   └── memories.json
    └── gigzs-demo/
        └── memories.json
```

### 📝 What's Stored?

Each `memories.json` file contains:
```json
[
  {
    "id": "uuid-here",
    "content": "User loves pizza",
    "embedding": [0.123, -0.456, ...],  // 384 numbers (vector)
    "metadata": {
      "userId": "user123",
      "tags": ["food", "preference"],
      "timestamp": 1697461234567
    },
    "timestamp": 1697461234567
  }
]
```

### 🔍 View Your Stored Memories

```bash
# Windows
type data\interactive-chat\memories.json

# Mac/Linux
cat data/interactive-chat/memories.json

# Or use a JSON viewer
code data/interactive-chat/memories.json
```

---

## Q2: Is there a vector database integrated?

### ✅ YES! Vector DB is Integrated

**Vector Database:** `SimpleVectorStore` (Pure JavaScript)

**Location:** `src/storage/SimpleVectorStore.ts`

### How It Works:

1. **Text → Vector Conversion**
   ```
   "I love pizza" → [0.123, -0.456, 0.789, ...] (384 numbers)
   ```

2. **Storage**
   - Vectors stored in memory (RAM)
   - Saved to `memories.json` on disk
   - Loaded back on restart

3. **Search**
   - Calculates cosine similarity between vectors
   - Finds semantically similar memories
   - Returns top K results

### Example:

```typescript
// Store
await memory.remember("I love pizza");
// Converts to vector: [0.123, -0.456, ...]
// Stores in SimpleVectorStore

// Search
await memory.recall({ query: "What food do I like?" });
// Converts query to vector: [0.119, -0.451, ...]
// Compares with all stored vectors
// Returns: "I love pizza" (95% similarity)
```

### 🎯 Why SimpleVectorStore?

| Feature | SimpleVectorStore | FAISS |
|---------|------------------|-------|
| **Setup** | Zero config | Requires native compilation |
| **Speed (10K vectors)** | ~50ms | ~10ms |
| **Dependencies** | None | Native C++ |
| **Works on** | All platforms | May fail on Windows |
| **Perfect for** | MVP, <100K vectors | Production, >100K vectors |

**For your MVP: SimpleVectorStore is perfect!** ✅

---

## Q3: Do I need an API key? Is AI even working?

### 🤖 Current Setup: Mock LLM (No API Key Needed!)

**Right now:** Using `MockLLM` - a fake AI for testing

**Location:** `src/cli/interactive-chat.ts` (line 10-34)

```typescript
class MockLLM implements LLMProvider {
  name = 'Mock AI';
  
  async generateResponse(prompt: string): Promise<string> {
    // Simulates AI response
    return "I understand! I'll remember this.";
  }
}
```

### ✅ Advantages of Mock LLM:
- ✅ No API key needed
- ✅ No cost
- ✅ Works immediately
- ✅ Tests memory system
- ✅ Fast responses

### ❌ Limitations:
- ❌ Not actually intelligent
- ❌ Generic responses
- ❌ Can't understand context deeply

---

## Q4: How to use a REAL AI?

### Option 1: Ollama (100% FREE, No API Key!)

#### Step 1: Install Ollama
```bash
# Windows: Download from https://ollama.ai
# Mac: brew install ollama
# Linux: curl https://ollama.ai/install.sh | sh
```

#### Step 2: Pull a Model
```bash
ollama pull llama2
# Other options: mistral, codellama, phi, gemma
```

#### Step 3: Start Ollama
```bash
ollama serve
```

#### Step 4: Update Chat to Use Ollama

Edit `src/cli/interactive-chat.ts` line 221:

```typescript
// BEFORE (Mock LLM):
orchestrator.setLLMProvider(new MockLLM());

// AFTER (Real AI):
import { OllamaProvider } from '../providers/OllamaProvider.js';
orchestrator.setLLMProvider(new OllamaProvider('llama2'));
```

#### Step 5: Chat!
```bash
npm run chat
```

**Now you have REAL AI with NO API KEY!** 🎉

---

### Option 2: OpenAI (Requires API Key)

#### Step 1: Get API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy it (starts with `sk-`)

#### Step 2: Set Environment Variable
```bash
# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-your-key-here"

# Mac/Linux
export OPENAI_API_KEY="sk-your-key-here"
```

#### Step 3: Update Chat

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

**Cost:** ~$0.002 per conversation (very cheap!)

---

### Option 3: Google Gemini (FREE API!)

#### Step 1: Get API Key
1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Copy it

#### Step 2: Set Environment Variable
```bash
# Windows
$env:GEMINI_API_KEY="your-key-here"

# Mac/Linux
export GEMINI_API_KEY="your-key-here"
```

#### Step 3: Update Chat

Edit `src/cli/interactive-chat.ts` line 221:

```typescript
import { GeminiProvider } from '../providers/GeminiProvider.js';
orchestrator.setLLMProvider(
  new GeminiProvider(process.env.GEMINI_API_KEY!)
);
```

#### Step 4: Chat!
```bash
npm run chat
```

**Cost:** FREE (generous free tier!)

---

## Q5: How does the vector database work exactly?

### 🧠 Step-by-Step Process

#### 1. **Storing a Memory**

```typescript
await memory.remember("I love pizza");
```

**What happens:**
```
1. Text: "I love pizza"
   ↓
2. Embedding Model (Xenova): Converts to 384 numbers
   ↓
3. Vector: [0.123, -0.456, 0.789, ..., 0.234]
   ↓
4. SimpleVectorStore: Stores in array
   ↓
5. Disk: Saves to memories.json
```

#### 2. **Searching Memories**

```typescript
await memory.recall({ query: "What food do I like?" });
```

**What happens:**
```
1. Query: "What food do I like?"
   ↓
2. Embedding Model: Converts to vector
   Query Vector: [0.119, -0.451, 0.792, ..., 0.229]
   ↓
3. SimpleVectorStore: Compares with ALL stored vectors
   
   Stored: [0.123, -0.456, 0.789, ...] "I love pizza"
   Query:  [0.119, -0.451, 0.792, ...]
   
   Cosine Similarity = 0.95 (95% match!)
   ↓
4. Returns: "I love pizza" with 95% similarity
```

#### 3. **Cosine Similarity Explained**

```
Vector A: [1, 2, 3]
Vector B: [1, 2, 3]
Similarity: 1.0 (100% - identical)

Vector A: [1, 2, 3]
Vector B: [1, 2, 4]
Similarity: 0.99 (99% - very similar)

Vector A: [1, 2, 3]
Vector B: [10, 20, 30]
Similarity: 1.0 (100% - same direction!)

Vector A: [1, 0, 0]
Vector B: [0, 1, 0]
Similarity: 0.0 (0% - perpendicular)
```

---

## Q6: Can I see the vectors?

### ✅ YES! View Stored Data

```bash
# View memories.json
code data/interactive-chat/memories.json
```

**Example content:**
```json
[
  {
    "id": "abc123",
    "content": "I love pizza",
    "embedding": [
      0.123, -0.456, 0.789, 0.234, -0.567,
      // ... 379 more numbers (384 total)
    ],
    "metadata": {
      "userId": "user123",
      "tags": ["food"]
    },
    "timestamp": 1697461234567
  }
]
```

---

## Q7: Summary - What's Actually Happening?

### Current Setup (No API Key):

```
You type message
    ↓
MockLLM generates fake response
    ↓
Memory system converts to vectors
    ↓
SimpleVectorStore stores in RAM + disk
    ↓
Next query: Searches vectors, finds similar
    ↓
Returns relevant memories
```

### With Real LLM (Ollama/OpenAI/Gemini):

```
You type message
    ↓
Real AI generates intelligent response
    ↓
Memory system converts to vectors
    ↓
SimpleVectorStore stores in RAM + disk
    ↓
Next query: Searches vectors, finds similar
    ↓
Returns relevant memories to AI
    ↓
AI uses memories to give contextual response
```

---

## 🎯 Quick Answers

| Question | Answer |
|----------|--------|
| **Where is data stored?** | `./data/interactive-chat/memories.json` |
| **Is vector DB integrated?** | ✅ YES - SimpleVectorStore |
| **Do I need API key?** | ❌ NO (using Mock LLM) |
| **Is AI working?** | ✅ YES (but it's fake for now) |
| **How to use real AI?** | Use Ollama (FREE) or OpenAI/Gemini |
| **Is it free?** | ✅ YES (100% free with Ollama) |

---

## 🚀 Next Steps

1. **Try the chat now:**
   ```bash
   npm run chat
   ```

2. **View stored memories:**
   ```bash
   code data/interactive-chat/memories.json
   ```

3. **Upgrade to real AI (Ollama - FREE!):**
   ```bash
   ollama pull llama2
   ollama serve
   # Edit src/cli/interactive-chat.ts line 221
   npm run chat
   ```

---

**Everything is working! The vector DB is integrated, memories are being stored, and you can upgrade to real AI anytime!** ✅
