# 🚀 Quick Start Guide

Get Supermemory running in 5 minutes!

## 📦 Installation

```bash
# Install dependencies
npm install

# Build the project (optional, for production)
npm run build
```

## 🎯 Run Your First Demo

### Option 1: Simple Memory Demo (Recommended First)

```bash
npm run test
```

This runs `src/examples/mock-llm-demo.ts` which demonstrates:
- ✅ Memory storage
- ✅ Semantic search
- ✅ Memory-augmented conversations
- ✅ No API key required!

### Option 2: Simple Usage Example

```bash
npx tsx src/examples/simple-usage.ts
```

Shows core memory operations without LLM integration.

### Option 3: Gigzs Integration Demo

```bash
npx tsx src/examples/gigzs-integration.ts
```

Full application example with user profiles, gig interactions, and chat.

## 💡 Your First Integration (3 Steps)

### Step 1: Install in Your Project

```bash
# Copy the src folder to your project, or
npm install @xenova/transformers faiss-node uuid
```

### Step 2: Create Your LLM Provider

```typescript
import { LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

class MyLLM implements LLMProvider {
  name = 'My AI';
  
  async generateResponse(prompt: string): Promise<string> {
    // Call your LLM API here (OpenAI, Claude, local, etc.)
    const response = await fetch('YOUR_LLM_API', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    return data.response;
  }
}
```

### Step 3: Use It!

```typescript
import { Supermemory } from './src/core/Supermemory.js';
import { AgentOrchestrator } from './src/orchestrator/AgentOrchestrator.js';

// Initialize
const memory = new Supermemory();
await memory.initialize();

const orchestrator = new AgentOrchestrator(memory);
orchestrator.setLLMProvider(new MyLLM());

// Chat with memory!
const result = await orchestrator.processQuery(
  "What did we discuss about the project?",
  { conversationId: 'my-chat' }
);

console.log(result.response);
console.log(`Used ${result.memoriesUsed} memories`);

// Save memories
await orchestrator.save();
```

## 🎨 Common Use Cases

### Use Case 1: Chatbot with Memory

```typescript
// Store user message
await memory.remember(
  "User wants to build a web app with React",
  { userId: 'user123', conversationId: 'chat-1' }
);

// Later, when user asks...
const results = await memory.recall({
  query: "What does the user want to build?",
  filter: { userId: 'user123' }
});

// Results will contain the relevant memory!
```

### Use Case 2: User Preferences

```typescript
// Store preferences
await memory.remember(
  "User prefers dark mode and email notifications",
  { userId: 'user123', type: 'preference' }
);

// Retrieve anytime
const prefs = await memory.recall({
  query: "user preferences",
  filter: { userId: 'user123', type: 'preference' }
});
```

### Use Case 3: Knowledge Base

```typescript
// Store documents
await memory.rememberBatch([
  { content: "Product X costs $99", metadata: { type: 'product' } },
  { content: "Shipping takes 3-5 days", metadata: { type: 'shipping' } },
  { content: "Returns accepted within 30 days", metadata: { type: 'policy' } }
]);

// Search semantically
const answer = await memory.recall({
  query: "How much does it cost?",
  topK: 1
});
```

## 🔧 Configuration Options

```typescript
const memory = new Supermemory({
  // Where to store memories (default: './data')
  storagePath: './my-app/memories',
  
  // Embedding model (default: 'Xenova/all-MiniLM-L6-v2')
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  
  // Vector dimension (default: 384)
  vectorDimension: 384,
  
  // Max memories (default: 100000)
  maxMemories: 100000
});
```

## 📊 Monitoring & Stats

```typescript
// Get statistics
const stats = memory.getStats();
console.log(`Total memories: ${stats.totalMemories}`);
console.log(`Storage path: ${stats.storagePath}`);

// Export all memories
const allMemories = memory.exportMemories();
console.log(`Exported ${allMemories.length} memories`);

// Clear all memories (careful!)
memory.clear();
```

## 🐛 Troubleshooting

### Issue: "Module not found"

**Solution:** Make sure you've installed dependencies:
```bash
npm install
```

### Issue: First query is slow

**Solution:** This is normal! The embedding model loads on first use (~2-3 seconds). Subsequent queries are fast (<100ms).

```typescript
// Pre-load during startup
await memory.initialize(); // Loads model immediately
```

### Issue: "Cannot find module 'faiss-node'"

**Solution:** FAISS requires native compilation. If it fails:

1. **Option A:** Use Windows Build Tools
```bash
npm install --global windows-build-tools
npm install faiss-node
```

2. **Option B:** Use alternative vector store (coming soon)

### Issue: Poor search results

**Solution:** Store more context in memories:

```typescript
// ❌ Too vague
await memory.remember("User likes pizza");

// ✅ Better
await memory.remember(
  "User John prefers margherita pizza with extra cheese, especially from Italian restaurants"
);
```

## 🎓 Next Steps

1. ✅ Run the demos (`npm run test`)
2. 📖 Read the [Integration Guide](./INTEGRATION_GUIDE.md)
3. 🔌 Check [LLM Provider Examples](./INTEGRATION_GUIDE.md#-llm-provider-examples)
4. 🏗️ See [Application Integration](./INTEGRATION_GUIDE.md#-application-integration)
5. 💡 Explore [Best Practices](./INTEGRATION_GUIDE.md#-best-practices)

## 🆓 Free Tools for MVP

All these tools are **100% free** for MVP:

| Tool | Purpose | Cost |
|------|---------|------|
| `@xenova/transformers` | Embeddings (local) | FREE |
| `faiss-node` | Vector DB (local) | FREE |
| Ollama | Local LLM | FREE |
| Hugging Face | LLM API (free tier) | FREE |
| Google Gemini | LLM API (free tier) | FREE |

## 📚 Example Code Snippets

### Complete Working Example

```typescript
import { Supermemory } from './src/core/Supermemory.js';
import { AgentOrchestrator, LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

// Mock LLM (replace with real one)
class MockLLM implements LLMProvider {
  name = 'Mock';
  async generateResponse(prompt: string) {
    return "I understand! Let me help you with that.";
  }
}

async function main() {
  // 1. Setup
  const memory = new Supermemory({ storagePath: './data/demo' });
  await memory.initialize();
  
  const orchestrator = new AgentOrchestrator(memory);
  orchestrator.setLLMProvider(new MockLLM());
  
  // 2. Store some info
  await memory.remember(
    "User is building a freelance marketplace called Gigzs",
    { userId: 'shivansh' }
  );
  
  // 3. Chat with memory
  const result = await orchestrator.processQuery(
    "What am I building?",
    { conversationId: 'demo' }
  );
  
  console.log(result.response);
  console.log(`Used ${result.memoriesUsed} memories`);
  
  // 4. Save
  await orchestrator.save();
}

main().catch(console.error);
```

## 🎉 You're Ready!

You now have a working Supermemory system that gives your AI infinite context!

**Key Points to Remember:**
- 🧠 Memories are stored as vectors (semantic meaning)
- 🔍 Search is by similarity, not keywords
- 💾 Everything persists to disk
- 🔌 Works with ANY LLM
- 🆓 100% free for MVP

Need help? Check the [full documentation](./README.md) or [integration guide](./INTEGRATION_GUIDE.md)!
