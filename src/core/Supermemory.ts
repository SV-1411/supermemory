/**
 * Supermemory - Main orchestrator for infinite context AI memory
 * This is the core class that ties everything together
 */

import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { SimpleVectorStore } from '../storage/SimpleVectorStore.js';
import {
  Memory,
  MemoryMetadata,
  MemoryQuery,
  MemoryResult,
  SupermemoryConfig,
  LLMContext
} from '../types/index.js';

export class Supermemory {
  private embeddingService: EmbeddingService;
  private vectorStore: SimpleVectorStore;
  private config: SupermemoryConfig;
  private isInitialized: boolean = false;

  constructor(config: SupermemoryConfig = {}) {
    this.config = {
      embeddingModel: config.embeddingModel || 'Xenova/all-MiniLM-L6-v2',
      vectorDimension: config.vectorDimension || 384,
      storagePath: config.storagePath || './data',
      maxMemories: config.maxMemories || 100000,
      userId: config.userId  // Add userId to config
    };

    this.embeddingService = new EmbeddingService(this.config.embeddingModel);
    
    // Create user-specific storage path if userId provided
    const userStoragePath = this.config.userId 
      ? `${this.config.storagePath}/user-${this.config.userId}`
      : this.config.storagePath;
    
    this.vectorStore = new SimpleVectorStore(
      this.config.vectorDimension!,
      userStoragePath
    );
  }

  /**
   * Initialize the Supermemory system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing Supermemory system...');
    
    await this.embeddingService.initialize();
    await this.vectorStore.initialize();
    
    this.isInitialized = true;
    console.log('✅ Supermemory system ready!\n');
  }

  /**
   * Store a new memory (conversation, document, etc.)
   */
  async remember(
    content: string,
    metadata: MemoryMetadata = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Generate embedding
    const embedding = await this.embeddingService.embed(content);

    // Create memory object
    const memory: Memory = {
      id: uuidv4(),
      content,
      embedding,
      metadata: {
        ...metadata,
        importance: metadata.importance || 0.5
      },
      timestamp: Date.now()
    };

    // Store in vector database
    await this.vectorStore.add(memory);

    return memory.id;
  }

  /**
   * Store multiple memories in batch
   */
  async rememberBatch(
    items: Array<{ content: string; metadata?: MemoryMetadata }>
  ): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const memories: Memory[] = [];
    const ids: string[] = [];

    for (const item of items) {
      const embedding = await this.embeddingService.embed(item.content);
      const id = uuidv4();
      
      memories.push({
        id,
        content: item.content,
        embedding,
        metadata: item.metadata || {},
        timestamp: Date.now()
      });

      ids.push(id);
    }

    await this.vectorStore.addBatch(memories);
    return ids;
  }

  /**
   * Recall memories based on semantic similarity
   */
  async recall(query: MemoryQuery): Promise<MemoryResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embed(query.query);

    // Search vector store
    const results = await this.vectorStore.search(
      queryEmbedding,
      query.topK || 5,
      query.filter
    );

    // Apply threshold filter if specified
    if (query.threshold !== undefined) {
      return results.filter(r => r.similarity >= query.threshold!);
    }

    return results;
  }

  /**
   * Build context for LLM with retrieved memories
   * This is what you inject into the LLM prompt
   */
  async buildLLMContext(
    currentQuery: string,
    options: {
      topK?: number;
      filter?: Partial<MemoryMetadata>;
      systemPrompt?: string;
    } = {}
  ): Promise<LLMContext> {
    const memories = await this.recall({
      query: currentQuery,
      topK: options.topK || 5,
      filter: options.filter
    });

    return {
      systemPrompt: options.systemPrompt,
      memories,
      currentQuery
    };
  }

  /**
   * Format LLM context into a prompt string
   */
  formatContextForPrompt(context: LLMContext): string {
    let prompt = '';

    if (context.systemPrompt) {
      prompt += `${context.systemPrompt}\n\n`;
    }

    if (context.memories.length > 0) {
      prompt += '=== RELEVANT MEMORIES ===\n';
      context.memories.forEach((result, idx) => {
        const timestamp = new Date(result.memory.timestamp).toLocaleString();
        prompt += `\n[Memory ${idx + 1}] (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n`;
        prompt += `Time: ${timestamp}\n`;
        
        if (result.memory.metadata.conversationId) {
          prompt += `Conversation: ${result.memory.metadata.conversationId}\n`;
        }
        
        prompt += `Content: ${result.memory.content}\n`;
      });
      prompt += '\n=== END MEMORIES ===\n\n';
    }

    prompt += `Current Query: ${context.currentQuery}`;

    return prompt;
  }

  /**
   * Store a conversation turn (user + assistant)
   */
  async rememberConversation(
    userMessage: string,
    assistantMessage: string,
    conversationId: string,
    metadata: Partial<MemoryMetadata> = {}
  ): Promise<{ userMemoryId: string; assistantMemoryId: string }> {
    const baseMetadata = {
      conversationId,
      ...metadata
    };

    const userMemoryId = await this.remember(userMessage, {
      ...baseMetadata,
      messageType: 'user'
    });

    const assistantMemoryId = await this.remember(assistantMessage, {
      ...baseMetadata,
      messageType: 'assistant'
    });

    return { userMemoryId, assistantMemoryId };
  }

  /**
   * Get statistics about stored memories
   */
  getStats(): {
    totalMemories: number;
    dimension: number;
    storagePath: string;
  } {
    return {
      totalMemories: this.vectorStore.getCount(),
      dimension: this.config.vectorDimension!,
      storagePath: this.config.storagePath!
    };
  }

  /**
   * Save all memories to disk
   */
  async save(): Promise<void> {
    await this.vectorStore.saveToDisk();
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.vectorStore.clear();
  }

  /**
   * Export all memories (for backup/analysis)
   */
  exportMemories(): Memory[] {
    return this.vectorStore.getAllMemories();
  }
}
