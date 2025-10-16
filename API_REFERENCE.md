# 📖 API Reference

Complete API documentation for Supermemory.

## Table of Contents

1. [Supermemory Class](#supermemory-class)
2. [AgentOrchestrator Class](#agentorchestrator-class)
3. [EmbeddingService Class](#embeddingservice-class)
4. [VectorStore Class](#vectorstore-class)
5. [Types & Interfaces](#types--interfaces)

---

## Supermemory Class

Main class for memory management.

### Constructor

```typescript
new Supermemory(config?: SupermemoryConfig)
```

**Parameters:**
- `config` (optional): Configuration object

**Config Options:**
```typescript
interface SupermemoryConfig {
  embeddingModel?: string;      // Default: 'Xenova/all-MiniLM-L6-v2'
  vectorDimension?: number;      // Default: 384
  storagePath?: string;          // Default: './data'
  maxMemories?: number;          // Default: 100000
}
```

**Example:**
```typescript
const memory = new Supermemory({
  storagePath: './my-app/memories',
  maxMemories: 50000
});
```

---

### initialize()

Initialize the memory system (loads embedding model and vector store).

```typescript
async initialize(): Promise<void>
```

**Returns:** Promise<void>

**Example:**
```typescript
await memory.initialize();
```

**Note:** Called automatically on first use, but recommended to call explicitly at startup.

---

### remember()

Store a single memory.

```typescript
async remember(
  content: string,
  metadata?: MemoryMetadata
): Promise<string>
```

**Parameters:**
- `content`: The text to remember
- `metadata` (optional): Additional metadata

**Returns:** Promise<string> - Memory ID (UUID)

**Example:**
```typescript
const id = await memory.remember(
  "User prefers dark mode",
  {
    userId: 'user123',
    tags: ['preference', 'ui'],
    importance: 0.8
  }
);
```

---

### rememberBatch()

Store multiple memories at once.

```typescript
async rememberBatch(
  items: Array<{
    content: string;
    metadata?: MemoryMetadata;
  }>
): Promise<string[]>
```

**Parameters:**
- `items`: Array of content and metadata objects

**Returns:** Promise<string[]> - Array of memory IDs

**Example:**
```typescript
const ids = await memory.rememberBatch([
  { content: "User likes pizza", metadata: { userId: 'user123' } },
  { content: "User lives in NYC", metadata: { userId: 'user123' } }
]);
```

---

### recall()

Search for memories by semantic similarity.

```typescript
async recall(query: MemoryQuery): Promise<MemoryResult[]>
```

**Parameters:**
- `query`: Query object

**Query Object:**
```typescript
interface MemoryQuery {
  query: string;                      // Search query
  topK?: number;                      // Number of results (default: 5)
  filter?: Partial<MemoryMetadata>;   // Metadata filter
  threshold?: number;                 // Min similarity (0-1)
}
```

**Returns:** Promise<MemoryResult[]>

**Result Object:**
```typescript
interface MemoryResult {
  memory: Memory;        // The memory object
  similarity: number;    // Similarity score (0-1)
}
```

**Example:**
```typescript
const results = await memory.recall({
  query: "What does the user like?",
  topK: 5,
  filter: { userId: 'user123' },
  threshold: 0.7
});

results.forEach(result => {
  console.log(`[${(result.similarity * 100).toFixed(1)}%] ${result.memory.content}`);
});
```

---

### rememberConversation()

Store a conversation turn (user message + assistant response).

```typescript
async rememberConversation(
  userMessage: string,
  assistantMessage: string,
  conversationId: string,
  metadata?: Partial<MemoryMetadata>
): Promise<{
  userMemoryId: string;
  assistantMemoryId: string;
}>
```

**Parameters:**
- `userMessage`: User's message
- `assistantMessage`: AI's response
- `conversationId`: Conversation identifier
- `metadata` (optional): Additional metadata

**Returns:** Promise with both memory IDs

**Example:**
```typescript
const { userMemoryId, assistantMemoryId } = await memory.rememberConversation(
  "What's the weather?",
  "It's sunny today!",
  "conv-123",
  { userId: 'user123' }
);
```

---

### buildLLMContext()

Build context object with retrieved memories for LLM.

```typescript
async buildLLMContext(
  currentQuery: string,
  options?: {
    topK?: number;
    filter?: Partial<MemoryMetadata>;
    systemPrompt?: string;
  }
): Promise<LLMContext>
```

**Parameters:**
- `currentQuery`: Current user query
- `options` (optional): Configuration options

**Returns:** Promise<LLMContext>

**Context Object:**
```typescript
interface LLMContext {
  systemPrompt?: string;
  memories: MemoryResult[];
  currentQuery: string;
}
```

**Example:**
```typescript
const context = await memory.buildLLMContext(
  "What are my preferences?",
  {
    topK: 5,
    filter: { userId: 'user123' },
    systemPrompt: "You are a helpful assistant."
  }
);
```

---

### formatContextForPrompt()

Format LLM context into a prompt string.

```typescript
formatContextForPrompt(context: LLMContext): string
```

**Parameters:**
- `context`: LLM context object

**Returns:** string - Formatted prompt

**Example:**
```typescript
const context = await memory.buildLLMContext("Tell me about the user");
const prompt = memory.formatContextForPrompt(context);

// Use prompt with your LLM
const response = await yourLLM.generate(prompt);
```

**Output Format:**
```
You are a helpful assistant.

=== RELEVANT MEMORIES ===

[Memory 1] (Relevance: 95.2%)
Time: 2024-01-15 10:30:00
Content: User prefers dark mode

[Memory 2] (Relevance: 87.3%)
Time: 2024-01-14 15:20:00
Content: User lives in NYC

=== END MEMORIES ===

Current Query: Tell me about the user
```

---

### getStats()

Get statistics about stored memories.

```typescript
getStats(): {
  totalMemories: number;
  dimension: number;
  storagePath: string;
}
```

**Returns:** Statistics object

**Example:**
```typescript
const stats = memory.getStats();
console.log(`Total memories: ${stats.totalMemories}`);
console.log(`Vector dimension: ${stats.dimension}`);
console.log(`Storage path: ${stats.storagePath}`);
```

---

### save()

Save all memories to disk.

```typescript
async save(): Promise<void>
```

**Returns:** Promise<void>

**Example:**
```typescript
await memory.save();
console.log('Memories saved!');
```

**Note:** Saves to:
- `{storagePath}/memories.json` - Metadata
- `{storagePath}/faiss.index` - Vector index

---

### clear()

Clear all memories from memory (does not delete from disk).

```typescript
clear(): void
```

**Example:**
```typescript
memory.clear();
console.log('All memories cleared');
```

---

### exportMemories()

Export all memories as an array.

```typescript
exportMemories(): Memory[]
```

**Returns:** Array of Memory objects

**Example:**
```typescript
const allMemories = memory.exportMemories();
console.log(`Exported ${allMemories.length} memories`);

// Save to file
fs.writeFileSync('backup.json', JSON.stringify(allMemories, null, 2));
```

---

## AgentOrchestrator Class

Orchestrates memory and LLM integration.

### Constructor

```typescript
new AgentOrchestrator(supermemory: Supermemory)
```

**Parameters:**
- `supermemory`: Initialized Supermemory instance

**Example:**
```typescript
const memory = new Supermemory();
await memory.initialize();

const orchestrator = new AgentOrchestrator(memory);
```

---

### setLLMProvider()

Set the LLM provider.

```typescript
setLLMProvider(provider: LLMProvider): void
```

**Parameters:**
- `provider`: LLM provider implementation

**LLMProvider Interface:**
```typescript
interface LLMProvider {
  name: string;
  generateResponse(prompt: string): Promise<string>;
}
```

**Example:**
```typescript
class MyLLM implements LLMProvider {
  name = 'My LLM';
  
  async generateResponse(prompt: string): Promise<string> {
    // Call your LLM API
    return "response";
  }
}

orchestrator.setLLMProvider(new MyLLM());
```

---

### processQuery()

Process a user query with memory augmentation and LLM response.

```typescript
async processQuery(
  userQuery: string,
  options?: OrchestrationOptions
): Promise<{
  response: string;
  memoriesUsed: number;
  memoryIds?: {
    userMemoryId: string;
    assistantMemoryId: string;
  };
}>
```

**Parameters:**
- `userQuery`: User's query
- `options` (optional): Configuration options

**Options:**
```typescript
interface OrchestrationOptions {
  useMemory?: boolean;              // Default: true
  memoryTopK?: number;              // Default: 5
  memoryFilter?: Partial<MemoryMetadata>;
  storeResponse?: boolean;          // Default: true
  conversationId?: string;          // Default: 'default'
  systemPrompt?: string;
}
```

**Returns:** Promise with response and metadata

**Example:**
```typescript
const result = await orchestrator.processQuery(
  "What did we discuss about the project?",
  {
    useMemory: true,
    memoryTopK: 5,
    memoryFilter: { userId: 'user123' },
    storeResponse: true,
    conversationId: 'project-chat',
    systemPrompt: "You are a project assistant."
  }
);

console.log(result.response);
console.log(`Used ${result.memoriesUsed} memories`);
```

---

### retrieveMemories()

Retrieve memories without LLM (just search).

```typescript
async retrieveMemories(
  query: string,
  topK?: number,
  filter?: Partial<MemoryMetadata>
): Promise<MemoryResult[]>
```

**Parameters:**
- `query`: Search query
- `topK` (optional): Number of results (default: 5)
- `filter` (optional): Metadata filter

**Returns:** Promise<MemoryResult[]>

**Example:**
```typescript
const memories = await orchestrator.retrieveMemories(
  "user preferences",
  5,
  { userId: 'user123' }
);
```

---

### storeMemory()

Manually store a memory.

```typescript
async storeMemory(
  content: string,
  metadata?: MemoryMetadata
): Promise<string>
```

**Parameters:**
- `content`: Memory content
- `metadata` (optional): Metadata

**Returns:** Promise<string> - Memory ID

**Example:**
```typescript
const id = await orchestrator.storeMemory(
  "Important information",
  { userId: 'user123', importance: 1.0 }
);
```

---

### getStats()

Get memory statistics.

```typescript
getStats(): {
  totalMemories: number;
  dimension: number;
  storagePath: string;
}
```

**Example:**
```typescript
const stats = orchestrator.getStats();
```

---

### save()

Save memories to disk.

```typescript
async save(): Promise<void>
```

**Example:**
```typescript
await orchestrator.save();
```

---

## Types & Interfaces

### Memory

```typescript
interface Memory {
  id: string;                    // UUID
  content: string;               // Original text
  embedding: number[];           // Vector (384 dimensions)
  metadata: MemoryMetadata;      // Metadata
  timestamp: number;             // Unix timestamp
}
```

### MemoryMetadata

```typescript
interface MemoryMetadata {
  userId?: string;
  conversationId?: string;
  messageType?: 'user' | 'assistant' | 'system';
  tags?: string[];
  importance?: number;           // 0-1 scale
  source?: string;
  [key: string]: any;            // Custom fields
}
```

### MemoryQuery

```typescript
interface MemoryQuery {
  query: string;                 // Search query
  topK?: number;                 // Number of results
  filter?: Partial<MemoryMetadata>;
  threshold?: number;            // Min similarity (0-1)
}
```

### MemoryResult

```typescript
interface MemoryResult {
  memory: Memory;
  similarity: number;            // 0-1 score
}
```

### LLMContext

```typescript
interface LLMContext {
  systemPrompt?: string;
  memories: MemoryResult[];
  currentQuery: string;
}
```

### LLMProvider

```typescript
interface LLMProvider {
  name: string;
  generateResponse(prompt: string): Promise<string>;
}
```

---

## Usage Examples

### Complete Example

```typescript
import { Supermemory } from './src/core/Supermemory.js';
import { AgentOrchestrator, LLMProvider } from './src/orchestrator/AgentOrchestrator.js';

// 1. Create LLM provider
class MyLLM implements LLMProvider {
  name = 'My AI';
  async generateResponse(prompt: string) {
    // Your LLM logic
    return "response";
  }
}

// 2. Initialize
const memory = new Supermemory({
  storagePath: './data/my-app'
});
await memory.initialize();

// 3. Create orchestrator
const orchestrator = new AgentOrchestrator(memory);
orchestrator.setLLMProvider(new MyLLM());

// 4. Store memories
await memory.remember("User likes pizza", { userId: 'user123' });
await memory.remember("User lives in NYC", { userId: 'user123' });

// 5. Query with memory
const result = await orchestrator.processQuery(
  "What do you know about me?",
  { memoryFilter: { userId: 'user123' } }
);

console.log(result.response);

// 6. Save
await orchestrator.save();
```

---

## Error Handling

All async methods can throw errors. Always use try-catch:

```typescript
try {
  await memory.initialize();
  const results = await memory.recall({ query: "test" });
} catch (error) {
  console.error('Memory error:', error);
  // Handle error
}
```

---

## Best Practices

### 1. Initialize Once

```typescript
// ✅ Good - Initialize once at startup
const memory = new Supermemory();
await memory.initialize();

// ❌ Bad - Don't initialize on every request
app.get('/api/chat', async (req, res) => {
  const memory = new Supermemory();
  await memory.initialize(); // Slow!
});
```

### 2. Use Metadata Filters

```typescript
// ✅ Good - Filter by userId
const results = await memory.recall({
  query: "preferences",
  filter: { userId: authenticatedUserId }
});

// ❌ Bad - No filter (returns all users' data)
const results = await memory.recall({ query: "preferences" });
```

### 3. Store Rich Context

```typescript
// ✅ Good - Rich context
await memory.remember(
  "User John prefers margherita pizza with extra cheese from Italian restaurants",
  { userId: 'john', tags: ['food', 'preference'] }
);

// ❌ Bad - Too vague
await memory.remember("likes pizza", { userId: 'john' });
```

### 4. Periodic Saves

```typescript
// ✅ Good - Auto-save every 5 minutes
setInterval(async () => {
  await memory.save();
}, 5 * 60 * 1000);
```

---

## Performance Tips

### 1. Batch Operations

```typescript
// ✅ Fast
await memory.rememberBatch(items);

// ❌ Slow
for (const item of items) {
  await memory.remember(item.content);
}
```

### 2. Limit topK

```typescript
// ✅ Fast - Only get what you need
await memory.recall({ query: "test", topK: 5 });

// ❌ Slow - Getting too many results
await memory.recall({ query: "test", topK: 100 });
```

### 3. Use Filters

```typescript
// ✅ Fast - Narrow search space
await memory.recall({
  query: "test",
  filter: { userId: 'user123', type: 'preference' }
});
```

---

That's the complete API reference! For more examples, see the `src/examples/` folder.
