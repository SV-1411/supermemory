/**
 * ChromaDB RAG (Retrieval-Augmented Generation)
 * Local/self-hosted vector database alternative to Pinecone
 */

import { ChromaClient } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { Memory, MemoryMetadata, MemoryResult } from '../types/index.js';

export interface ChromaConfig {
  host?: string;
  port?: number;
  collectionName: string;
}

export class ChromaRAG {
  private client: ChromaClient;
  private collectionName: string;
  private embeddingService: EmbeddingService;
  private collection: any;

  constructor(config: ChromaConfig) {
    this.client = new ChromaClient({
      path: `http://${config.host || 'localhost'}:${config.port || 8000}`
    });
    this.collectionName = config.collectionName;
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Initialize ChromaDB collection
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing ChromaDB RAG...');
    
    // Initialize embedding service
    await this.embeddingService.initialize();
    
    // Get or create collection
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'Supermemory vector store' }
      });
      console.log('✅ ChromaDB RAG initialized!');
    } catch (error) {
      console.error('❌ Error initializing ChromaDB:', error);
      throw error;
    }
  }

  /**
   * CREATE: Store a memory
   */
  async create(content: string, metadata: MemoryMetadata = {}): Promise<string> {
    console.log('💾 Storing memory in ChromaDB...');
    
    const embedding = await this.embeddingService.embed(content);
    const id = uuidv4();

    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [{
        content,
        timestamp: Date.now().toString(),
        userId: metadata.userId || 'default',
        conversationId: metadata.conversationId || 'default',
        messageType: metadata.messageType || 'user',
        importance: (metadata.importance || 0.5).toString(),
        category: (metadata as any).category || 'general',
        tags: metadata.tags?.join(',') || ''
      }]
    });

    console.log(`✅ Memory stored: ${id.slice(0, 8)}...`);
    return id;
  }

  /**
   * CREATE BATCH: Store multiple memories
   */
  async createBatch(
    items: Array<{ content: string; metadata?: MemoryMetadata }>
  ): Promise<string[]> {
    console.log(`💾 Storing ${items.length} memories in batch...`);
    
    const ids: string[] = [];
    const embeddings: number[][] = [];
    const metadatas: any[] = [];

    for (const item of items) {
      const embedding = await this.embeddingService.embed(item.content);
      const id = uuidv4();
      
      ids.push(id);
      embeddings.push(embedding);
      metadatas.push({
        content: item.content,
        timestamp: Date.now().toString(),
        userId: item.metadata?.userId || 'default',
        conversationId: item.metadata?.conversationId || 'default',
        messageType: item.metadata?.messageType || 'user',
        importance: (item.metadata?.importance || 0.5).toString(),
        category: (item.metadata as any)?.category || 'general',
        tags: item.metadata?.tags?.join(',') || ''
      });
    }

    await this.collection.add({
      ids,
      embeddings,
      metadatas
    });

    console.log(`✅ Stored ${ids.length} memories`);
    return ids;
  }

  /**
   * READ: Retrieve memories using RAG
   */
  async retrieve(
    query: string,
    options: {
      topK?: number;
      filter?: Partial<MemoryMetadata>;
      threshold?: number;
    } = {}
  ): Promise<MemoryResult[]> {
    const { topK = 5, filter, threshold = 0.7 } = options;
    
    console.log(`🔍 Retrieving memories for: "${query.slice(0, 50)}..."`);
    
    const queryEmbedding = await this.embeddingService.embed(query);
    
    // Build where clause
    const where: any = {};
    if (filter?.userId) {
      where.userId = filter.userId;
    }
    if (filter?.conversationId) {
      where.conversationId = filter.conversationId;
    }
    if ((filter as any)?.category) {
      where.category = (filter as any).category;
    }

    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      where: Object.keys(where).length > 0 ? where : undefined
    });

    const memoryResults: MemoryResult[] = [];

    if (results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances?.[0]?.[i] || 0;
        const similarity = 1 - distance; // Convert distance to similarity

        if (similarity >= threshold) {
          const metadata = results.metadatas?.[0]?.[i] as any;
          
          const memory: Memory = {
            id: results.ids[0][i],
            content: metadata.content,
            embedding: results.embeddings?.[0]?.[i] || [],
            metadata: {
              userId: metadata.userId,
              conversationId: metadata.conversationId,
              messageType: metadata.messageType,
              importance: parseFloat(metadata.importance),
              tags: metadata.tags ? metadata.tags.split(',') : []
            },
            timestamp: parseInt(metadata.timestamp)
          };

          memoryResults.push({
            memory,
            similarity
          });
        }
      }
    }

    console.log(`✅ Retrieved ${memoryResults.length} memories`);
    return memoryResults;
  }

  /**
   * UPDATE: Update a memory
   */
  async update(id: string, content: string, metadata?: MemoryMetadata): Promise<void> {
    console.log(`🔄 Updating memory: ${id.slice(0, 8)}...`);
    
    const embedding = await this.embeddingService.embed(content);

    await this.collection.update({
      ids: [id],
      embeddings: [embedding],
      metadatas: [{
        content,
        timestamp: Date.now().toString(),
        userId: metadata?.userId || 'default',
        conversationId: metadata?.conversationId || 'default',
        messageType: metadata?.messageType || 'user',
        importance: (metadata?.importance || 0.5).toString(),
        category: (metadata as any)?.category || 'general',
        tags: metadata?.tags?.join(',') || ''
      }]
    });

    console.log(`✅ Memory updated: ${id.slice(0, 8)}...`);
  }

  /**
   * DELETE: Delete a memory
   */
  async delete(id: string): Promise<void> {
    console.log(`🗑️  Deleting memory: ${id.slice(0, 8)}...`);
    
    await this.collection.delete({
      ids: [id]
    });
    
    console.log(`✅ Memory deleted: ${id.slice(0, 8)}...`);
  }

  /**
   * DELETE BATCH: Delete multiple memories
   */
  async deleteBatch(ids: string[]): Promise<void> {
    console.log(`🗑️  Deleting ${ids.length} memories...`);
    
    await this.collection.delete({
      ids
    });
    
    console.log(`✅ Deleted ${ids.length} memories`);
  }

  /**
   * DELETE ALL: Delete all memories for a user
   */
  async deleteAllForUser(userId: string): Promise<void> {
    console.log(`🗑️  Deleting all memories for user: ${userId}...`);
    
    await this.collection.delete({
      where: { userId }
    });
    
    console.log(`✅ Deleted all memories for user: ${userId}`);
  }

  /**
   * GET STATS: Get collection statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    collectionName: string;
  }> {
    const count = await this.collection.count();
    
    return {
      totalVectors: count,
      collectionName: this.collectionName
    };
  }

  /**
   * RAG: Retrieve and Generate
   */
  async retrieveAndGenerate(
    query: string,
    llmProvider: any,
    options: {
      topK?: number;
      filter?: Partial<MemoryMetadata>;
      systemPrompt?: string;
    } = {}
  ): Promise<{
    response: string;
    memories: MemoryResult[];
    context: string;
  }> {
    const memories = await this.retrieve(query, {
      topK: options.topK || 5,
      filter: options.filter
    });

    let context = options.systemPrompt || 'You are a helpful AI assistant with perfect memory.';
    context += '\n\n=== RELEVANT MEMORIES ===\n\n';

    if (memories.length > 0) {
      memories.forEach((result, idx) => {
        const date = new Date(result.memory.timestamp).toLocaleString();
        context += `[Memory ${idx + 1}] (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n`;
        context += `Time: ${date}\n`;
        context += `Content: ${result.memory.content}\n\n`;
      });
    } else {
      context += 'No relevant memories found.\n\n';
    }

    context += '=== END MEMORIES ===\n\n';
    context += `Current Query: ${query}`;

    const response = await llmProvider.generateResponse(context);

    return {
      response,
      memories,
      context
    };
  }
}
