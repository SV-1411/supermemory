# 🔌 Integration Guide - Supermemory with Any AI

This guide shows you how to integrate Supermemory with different AI systems and applications.

## 📋 Table of Contents

1. [Core Concepts](#core-concepts)
2. [Integration Patterns](#integration-patterns)
3. [LLM Provider Examples](#llm-provider-examples)
4. [Application Integration](#application-integration)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## 🎯 Core Concepts

### The Memory Flow

```
User Input → Embedding → Vector Search → Context Building → LLM → Response → Store
```

1. **User sends a query**
2. **Query is embedded** into a vector
3. **Vector search** finds similar memories
4. **Context is built** with retrieved memories
5. **LLM generates response** using context
6. **Conversation is stored** for future recall

### Key Components

- **Supermemory**: Core memory storage and retrieval
- **AgentOrchestrator**: Manages the flow between memory and LLM
- **LLMProvider**: Interface for any LLM (OpenAI, Claude, local, etc.)
- **VectorStore**: FAISS-based vector database
- **EmbeddingService**: Local embedding generation

## 🔄 Integration Patterns

### Pattern 1: Simple Memory (No LLM)

Use Supermemory just for storage and retrieval without an LLM.

```typescript
import { Supermemory } from './src/core/Supermemory.js';

const memory = new Supermemory();
await memory.initialize();

// Store
await memory.remember("User prefers dark mode", { userId: 'user123' });

// Retrieve
const results = await memory.recall({
  query: "What are user preferences?",
  filter: { userId: 'user123' }
});
```

**Use Cases:**
- User preference storage
- Document search
- Knowledge base
- Semantic search engine

### Pattern 2: Memory + LLM (Full Orchestration)

Use AgentOrchestrator to combine memory with any LLM.

```typescript
import { Supermemory } from './src/core/Supermemory.js';
import { AgentOrchestrator, LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

// Your LLM implementation
class MyLLM implements LLMProvider {
  name = 'My LLM';
  async generateResponse(prompt: string): Promise<string> {
    // Call your LLM API
    return "response";
  }
}

const memory = new Supermemory();
await memory.initialize();

const orchestrator = new AgentOrchestrator(memory);
orchestrator.setLLMProvider(new MyLLM());

// Process with memory augmentation
const result = await orchestrator.processQuery("What did we discuss?");
```

**Use Cases:**
- Chatbots with memory
- AI assistants
- Customer support bots
- Personal AI companions

### Pattern 3: Hybrid (Manual Control)

Manually control when to use memory and how to format prompts.

```typescript
const memory = new Supermemory();
await memory.initialize();

// Store conversation manually
await memory.remember(userMessage, { conversationId: 'chat-1' });

// Retrieve when needed
const context = await memory.buildLLMContext(newQuery, { topK: 5 });

// Format and use with your LLM
const prompt = memory.formatContextForPrompt(context);
const response = await yourLLM.generate(prompt);

// Store response
await memory.remember(response, { conversationId: 'chat-1' });
```

**Use Cases:**
- Custom workflows
- Complex multi-step reasoning
- Selective memory usage
- Fine-grained control

## 🤖 LLM Provider Examples

### OpenAI (GPT-3.5/GPT-4)

```typescript
import OpenAI from 'openai';
import { LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

class OpenAIProvider implements LLMProvider {
  name = 'OpenAI GPT';
  private client: OpenAI;

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    });
    return response.choices[0].message.content || '';
  }
}

// Usage
const provider = new OpenAIProvider(process.env.OPENAI_API_KEY!);
orchestrator.setLLMProvider(provider);
```

### Anthropic Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

class ClaudeProvider implements LLMProvider {
  name = 'Claude';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }
}

// Usage
const provider = new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);
orchestrator.setLLMProvider(provider);
```

### Local LLM (Ollama)

```typescript
import { LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  private model: string;
  private baseUrl: string;

  constructor(model: string = 'llama2', baseUrl: string = 'http://localhost:11434') {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();
    return data.response;
  }
}

// Usage (100% free, runs locally!)
const provider = new OllamaProvider('llama2');
orchestrator.setLLMProvider(provider);
```

### Hugging Face Inference API

```typescript
import { LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

class HuggingFaceProvider implements LLMProvider {
  name = 'Hugging Face';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'mistralai/Mistral-7B-Instruct-v0.2') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(prompt: string): Promise<string> {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${this.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    const data = await response.json();
    return data[0].generated_text;
  }
}

// Usage (free tier available!)
const provider = new HuggingFaceProvider(process.env.HF_API_KEY!);
orchestrator.setLLMProvider(provider);
```

### Google Gemini

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

class GeminiProvider implements LLMProvider {
  name = 'Google Gemini';
  private model: any;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateResponse(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}

// Usage
const provider = new GeminiProvider(process.env.GEMINI_API_KEY!);
orchestrator.setLLMProvider(provider);
```

## 🏗️ Application Integration

### Express.js API

```typescript
import express from 'express';
import { Supermemory } from './src/core/Supermemory.js';
import { AgentOrchestrator } from './src/orchestrator/AgentOrchestrator.js';

const app = express();
app.use(express.json());

// Initialize once
const memory = new Supermemory({ storagePath: './data/api' });
await memory.initialize();

const orchestrator = new AgentOrchestrator(memory);
orchestrator.setLLMProvider(new YourLLMProvider());

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { userId, message, conversationId } = req.body;

  try {
    const result = await orchestrator.processQuery(message, {
      conversationId: conversationId || `user-${userId}`,
      memoryFilter: { userId },
      storeResponse: true
    });

    res.json({
      response: result.response,
      memoriesUsed: result.memoriesUsed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memory endpoint
app.post('/api/memory', async (req, res) => {
  const { userId, content, metadata } = req.body;

  try {
    const id = await orchestrator.storeMemory(content, {
      userId,
      ...metadata
    });

    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  const { userId, query, topK = 5 } = req.query;

  try {
    const results = await orchestrator.retrieveMemories(
      query as string,
      parseInt(topK as string),
      { userId }
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('API running on port 3000'));
```

### Next.js Integration

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/supermemory';

export async function POST(req: NextRequest) {
  const { message, userId } = await req.json();

  const orchestrator = await getOrchestrator();

  const result = await orchestrator.processQuery(message, {
    conversationId: `user-${userId}`,
    memoryFilter: { userId }
  });

  return NextResponse.json(result);
}

// lib/supermemory.ts
import { Supermemory } from 'supermemory-ai';
import { AgentOrchestrator } from 'supermemory-ai';

let orchestrator: AgentOrchestrator | null = null;

export async function getOrchestrator() {
  if (!orchestrator) {
    const memory = new Supermemory();
    await memory.initialize();
    
    orchestrator = new AgentOrchestrator(memory);
    orchestrator.setLLMProvider(new YourLLMProvider());
  }
  
  return orchestrator;
}
```

### React Hook

```typescript
// hooks/useSupermemory.ts
import { useState } from 'react';

export function useSupermemory() {
  const [loading, setLoading] = useState(false);

  const chat = async (message: string, userId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId })
      });
      return await response.json();
    } finally {
      setLoading(false);
    }
  };

  const storeMemory = async (content: string, metadata: any) => {
    const response = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, metadata })
    });
    return await response.json();
  };

  return { chat, storeMemory, loading };
}

// Usage in component
function ChatComponent() {
  const { chat, loading } = useSupermemory();
  
  const handleSend = async (message: string) => {
    const result = await chat(message, 'user123');
    console.log(result.response);
  };
  
  return <div>...</div>;
}
```

## ✅ Best Practices

### 1. Memory Organization

```typescript
// Use consistent metadata structure
await memory.remember(content, {
  userId: 'user123',
  type: 'conversation' | 'profile' | 'interaction',
  category: 'preference' | 'history' | 'feedback',
  tags: ['relevant', 'tags'],
  importance: 0.8, // 0-1 scale
  timestamp: Date.now()
});
```

### 2. Efficient Retrieval

```typescript
// Use filters to narrow search space
const results = await memory.recall({
  query: "user preferences",
  topK: 5,
  filter: { 
    userId: 'user123',
    type: 'profile'
  },
  threshold: 0.7 // Only return high-confidence matches
});
```

### 3. Batch Operations

```typescript
// Store multiple memories at once
await memory.rememberBatch([
  { content: "Memory 1", metadata: { userId: 'user123' } },
  { content: "Memory 2", metadata: { userId: 'user123' } },
  { content: "Memory 3", metadata: { userId: 'user123' } }
]);
```

### 4. Periodic Saves

```typescript
// Save to disk periodically
setInterval(async () => {
  await memory.save();
  console.log('Memories saved to disk');
}, 5 * 60 * 1000); // Every 5 minutes
```

### 5. Error Handling

```typescript
try {
  const result = await orchestrator.processQuery(query);
} catch (error) {
  if (error.message.includes('not initialized')) {
    await memory.initialize();
    // Retry
  } else {
    console.error('Memory error:', error);
    // Fallback to LLM without memory
  }
}
```

## 🐛 Troubleshooting

### Issue: Slow First Query

**Cause:** Model loading on first use

**Solution:**
```typescript
// Pre-initialize during app startup
await memory.initialize(); // Loads embedding model
```

### Issue: Out of Memory

**Cause:** Too many memories loaded

**Solution:**
```typescript
// Use filters to reduce search space
// Or implement memory pruning
const oldMemories = memory.exportMemories()
  .filter(m => Date.now() - m.timestamp > 30 * 24 * 60 * 60 * 1000);
// Delete old memories
```

### Issue: Poor Retrieval Quality

**Cause:** Query-memory mismatch

**Solution:**
```typescript
// Store more context in memories
await memory.remember(
  `User ${userName} prefers ${preference} because ${reason}`,
  metadata
);

// Use more specific queries
const results = await memory.recall({
  query: "What does user123 prefer for breakfast?", // Specific
  topK: 3
});
```

### Issue: LLM Not Using Memories

**Cause:** Prompt formatting

**Solution:**
```typescript
// Ensure memories are properly formatted
const context = await memory.buildLLMContext(query, {
  systemPrompt: "Use the provided memories to answer accurately."
});

// Check formatted prompt
console.log(memory.formatContextForPrompt(context));
```

## 🚀 Production Checklist

- [ ] Initialize memory once at app startup
- [ ] Implement periodic saves (every 5-10 minutes)
- [ ] Add error handling and fallbacks
- [ ] Use metadata filters for efficient retrieval
- [ ] Set appropriate `topK` values (5-10 for most cases)
- [ ] Monitor memory usage and implement pruning if needed
- [ ] Use environment variables for configuration
- [ ] Add logging for debugging
- [ ] Test with realistic data volumes
- [ ] Implement backup/restore functionality

## 📚 Additional Resources

- [Main README](./README.md)
- [API Reference](./README.md#-api-reference)
- [Examples](./src/examples/)

---

Need help? Open an issue or check the examples folder for more integration patterns!
