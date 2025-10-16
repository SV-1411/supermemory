# 🏗️ Supermemory Architecture

Deep dive into how Supermemory works under the hood.

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
│  (Your App: Web, Mobile, CLI, API, etc.)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                            │
│  • Routes queries to memory or LLM                              │
│  • Manages conversation flow                                    │
│  • Handles memory storage decisions                             │
│  • Formats context for LLM                                      │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐    ┌────────────────────────────────┐
│   Supermemory Core       │    │      LLM Provider              │
│  • Memory management     │    │  • OpenAI GPT                  │
│  • Context building      │    │  • Anthropic Claude            │
│  • Conversation storage  │    │  • Google Gemini               │
│  • Export/import         │    │  • Local models (Ollama)       │
└──────────┬───────────────┘    │  • Hugging Face                │
           │                    └────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────────┐
│Embedding│  │ Vector Store │
│Service  │  │   (FAISS)    │
│         │  │              │
│• Xenova │  │• IndexFlatL2 │
│• Local  │  │• Fast search │
│• Free   │  │• Persistent  │
└─────────┘  └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │  Disk Storage│
             │              │
             │• memories.json│
             │• faiss.index │
             └──────────────┘
```

## 🔄 Data Flow

### 1. Memory Storage Flow

```
User Input
    │
    ▼
[Orchestrator receives input]
    │
    ▼
[EmbeddingService.embed(text)]
    │
    ├─→ Load model (first time only)
    ├─→ Tokenize text
    ├─→ Generate 384-dim vector
    │
    ▼
[Create Memory object]
    │
    ├─→ id: UUID
    ├─→ content: original text
    ├─→ embedding: [0.123, -0.456, ...]
    ├─→ metadata: {userId, tags, etc.}
    ├─→ timestamp: Date.now()
    │
    ▼
[VectorStore.add(memory)]
    │
    ├─→ Add vector to FAISS index
    ├─→ Store memory in array
    │
    ▼
[Optional: Save to disk]
    │
    ├─→ memories.json (metadata)
    ├─→ faiss.index (vectors)
```

### 2. Memory Retrieval Flow

```
User Query
    │
    ▼
[Orchestrator receives query]
    │
    ▼
[EmbeddingService.embed(query)]
    │
    ├─→ Generate query vector
    │
    ▼
[VectorStore.search(queryVector, topK)]
    │
    ├─→ FAISS similarity search
    ├─→ Get top K nearest neighbors
    ├─→ Calculate similarity scores
    │
    ▼
[Apply metadata filters]
    │
    ├─→ Filter by userId
    ├─→ Filter by tags
    ├─→ Filter by type
    │
    ▼
[Return MemoryResult[]]
    │
    ├─→ memory: Memory object
    ├─→ similarity: 0.0-1.0 score
    │
    ▼
[Build LLM Context]
    │
    ├─→ Format memories
    ├─→ Add system prompt
    ├─→ Add current query
    │
    ▼
[Send to LLM]
    │
    ▼
[LLM generates response]
    │
    ▼
[Store conversation]
    │
    ▼
Return to user
```

## 🧩 Component Details

### 1. EmbeddingService

**Purpose:** Convert text to numerical vectors

**Technology:** `@xenova/transformers` (Xenova/all-MiniLM-L6-v2)

**Key Features:**
- Runs locally (no API calls)
- 384-dimensional embeddings
- Mean pooling + normalization
- ~50-100ms per embedding

**Code Flow:**
```typescript
text → tokenize → model inference → pooling → normalize → vector[384]
```

**Why This Model?**
- ✅ Small size (~80MB)
- ✅ Fast inference
- ✅ Good semantic understanding
- ✅ Optimized for similarity search
- ✅ Runs in Node.js

### 2. VectorStore (FAISS)

**Purpose:** Fast similarity search over vectors

**Technology:** `faiss-node` (Facebook AI Similarity Search)

**Index Type:** `IndexFlatL2` (L2 distance, exact search)

**Key Features:**
- Exact nearest neighbor search
- O(n) search complexity (acceptable for <100K vectors)
- Persistent storage
- Low memory footprint

**Search Algorithm:**
```
1. Compute L2 distance: d = ||query - memory||²
2. Sort by distance (ascending)
3. Return top K results
4. Convert distance to similarity: s = 1 / (1 + d)
```

**Why FAISS?**
- ✅ Industry standard (used by Meta, OpenAI)
- ✅ Extremely fast
- ✅ Free and open source
- ✅ Scales to millions of vectors
- ✅ Multiple index types available

### 3. Supermemory Core

**Purpose:** High-level memory management

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `remember()` | Store single memory | `memoryId` |
| `rememberBatch()` | Store multiple memories | `memoryId[]` |
| `recall()` | Search memories | `MemoryResult[]` |
| `buildLLMContext()` | Build context for LLM | `LLMContext` |
| `rememberConversation()` | Store user+AI turn | `{userMemoryId, assistantMemoryId}` |
| `save()` | Persist to disk | `void` |
| `exportMemories()` | Export all memories | `Memory[]` |

**Memory Object Structure:**
```typescript
{
  id: "uuid-v4",
  content: "The actual text",
  embedding: [0.123, -0.456, ...], // 384 numbers
  metadata: {
    userId: "user123",
    conversationId: "conv-456",
    messageType: "user" | "assistant" | "system",
    tags: ["preference", "important"],
    importance: 0.8,
    timestamp: 1234567890,
    // ... custom fields
  },
  timestamp: 1234567890
}
```

### 4. AgentOrchestrator

**Purpose:** Coordinate memory and LLM

**Key Responsibilities:**
1. Decide when to use memory
2. Retrieve relevant memories
3. Format context for LLM
4. Call LLM with augmented prompt
5. Store response in memory

**Orchestration Flow:**
```typescript
processQuery(userQuery) {
  // 1. Retrieve memories
  memories = supermemory.recall(userQuery)
  
  // 2. Build context
  context = supermemory.buildLLMContext(userQuery, memories)
  
  // 3. Format prompt
  prompt = formatContextForPrompt(context)
  
  // 4. Call LLM
  response = llmProvider.generateResponse(prompt)
  
  // 5. Store conversation
  supermemory.rememberConversation(userQuery, response)
  
  return response
}
```

### 5. LLMProvider Interface

**Purpose:** Abstract LLM implementation

**Interface:**
```typescript
interface LLMProvider {
  name: string;
  generateResponse(prompt: string): Promise<string>;
}
```

**Why This Design?**
- ✅ Swap LLMs without changing code
- ✅ Test with mock LLMs
- ✅ Support multiple LLMs simultaneously
- ✅ Easy to add new providers

## 🎯 Design Decisions

### Why Local Embeddings?

**Pros:**
- ✅ No API costs
- ✅ No rate limits
- ✅ Privacy (data never leaves your server)
- ✅ Fast (no network latency)
- ✅ Works offline

**Cons:**
- ❌ Slightly lower quality than OpenAI embeddings
- ❌ Requires CPU/memory
- ❌ Model download on first use

**Decision:** For MVP, local embeddings are perfect. You can upgrade to OpenAI embeddings later if needed.

### Why FAISS Over Other Vector DBs?

**Alternatives Considered:**
- Pinecone (cloud, costs money)
- Weaviate (complex setup)
- Milvus (heavy, requires Docker)
- ChromaDB (Python-first)
- Qdrant (good, but more complex)

**Why FAISS:**
- ✅ Simplest setup
- ✅ Fastest for <100K vectors
- ✅ Free forever
- ✅ Battle-tested
- ✅ Works in Node.js

### Why TypeScript?

**Pros:**
- ✅ Type safety prevents bugs
- ✅ Better IDE support
- ✅ Self-documenting code
- ✅ Easy refactoring
- ✅ Modern ecosystem

**Cons:**
- ❌ Compilation step
- ❌ Slightly more verbose

**Decision:** TypeScript is worth it for production code.

## 📊 Performance Characteristics

### Time Complexity

| Operation | Complexity | Typical Time |
|-----------|-----------|--------------|
| Initialize | O(1) | 2-3 seconds (model load) |
| Embed text | O(n) | 50-100ms |
| Add memory | O(1) | <1ms |
| Search (FAISS) | O(n) | <10ms for 10K memories |
| Save to disk | O(n) | 100ms for 10K memories |

### Space Complexity

| Component | Size per Memory |
|-----------|----------------|
| Embedding vector | 384 × 4 bytes = 1.5 KB |
| Metadata (JSON) | ~200-500 bytes |
| **Total** | **~2 KB per memory** |

**Example:** 10,000 memories ≈ 20 MB

### Scalability

| Memory Count | Search Time | Storage Size |
|--------------|-------------|--------------|
| 1,000 | <1ms | 2 MB |
| 10,000 | <10ms | 20 MB |
| 100,000 | <100ms | 200 MB |
| 1,000,000 | ~1s | 2 GB |

**Note:** For >100K memories, consider upgrading to FAISS IVF index for faster search.

## 🔐 Security Considerations

### Data Privacy

- ✅ All data stored locally
- ✅ No external API calls (for embeddings)
- ✅ Full control over data
- ✅ GDPR-friendly (easy to delete user data)

### Best Practices

1. **Encrypt sensitive data** before storing
2. **Implement user data isolation** (filter by userId)
3. **Add authentication** to API endpoints
4. **Regular backups** of memory data
5. **Audit logs** for memory access

## 🚀 Optimization Opportunities

### Current Implementation (MVP)

- Simple, straightforward code
- Good for <100K memories
- No complex optimizations

### Future Optimizations

1. **Better FAISS Index**
   - Switch to IVF (Inverted File Index)
   - 10-100x faster search
   - Slight accuracy trade-off

2. **Batch Processing**
   - Embed multiple texts at once
   - Reduce model overhead

3. **Memory Compression**
   - Summarize old memories
   - Reduce storage size

4. **Caching**
   - Cache frequent queries
   - LRU cache for embeddings

5. **Async Operations**
   - Background saving
   - Lazy loading

## 🧪 Testing Strategy

### Unit Tests
- EmbeddingService: vector generation
- VectorStore: CRUD operations
- Supermemory: memory management
- AgentOrchestrator: flow control

### Integration Tests
- End-to-end memory storage/retrieval
- LLM integration
- Persistence (save/load)

### Performance Tests
- Search speed with various memory counts
- Memory usage monitoring
- Concurrent operations

## 📚 Further Reading

- [FAISS Documentation](https://github.com/facebookresearch/faiss)
- [Sentence Transformers](https://www.sbert.net/)
- [Vector Embeddings Explained](https://www.pinecone.io/learn/vector-embeddings/)
- [Semantic Search Guide](https://www.sbert.net/examples/applications/semantic-search/README.html)

---

This architecture is designed to be **simple, fast, and free** for MVP while remaining **scalable and production-ready** for growth.
