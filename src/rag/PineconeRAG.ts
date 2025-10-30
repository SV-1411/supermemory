/**
 * Pinecone RAG (Retrieval-Augmented Generation)
 * Production-grade vector database with full CRUD operations
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { Memory, MemoryMetadata, MemoryResult } from '../types/index';

export interface PineconeConfig {
  apiKey: string;
  environment?: string;
  indexName: string;
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

export class PineconeRAG {
  private pinecone: Pinecone;
  private indexName: string;
  private embeddingService: EmbeddingService;
  private dimension: number;
  private index: any;

  constructor(config: PineconeConfig) {
    this.pinecone = new Pinecone({
      apiKey: config.apiKey
    });
    this.indexName = config.indexName;
    this.dimension = config.dimension || 384;
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Initialize Pinecone index
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Pinecone RAG...');
    
    // Initialize embedding service
    await this.embeddingService.initialize();
    
    try {
      // Check if index exists
      const indexes = await this.pinecone.listIndexes();
      const indexList = indexes?.indexes || [];
      const indexExists = indexList.some((idx: any) => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`📦 Creating Pinecone index: ${this.indexName}...`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Wait for index to be ready
        console.log('⏳ Waiting for index to be ready...');
        await this.waitForIndexReady();
      }

      this.index = this.pinecone.index(this.indexName);
      console.log('✅ Pinecone RAG initialized!');
    } catch (error) {
      console.error('❌ Error initializing Pinecone:', error);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(): Promise<void> {
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!ready && attempts < maxAttempts) {
      try {
        const description = await this.pinecone.describeIndex(this.indexName);
        ready = description.status?.ready || false;
        
        if (!ready) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    if (!ready) {
      throw new Error('Index failed to become ready');
    }
  }

  /**
   * CREATE: Store a memory in Pinecone
   */
  async create(content: string, metadata: MemoryMetadata = {}): Promise<string> {
    console.log('💾 Storing memory in Pinecone...');
    
    // Generate embedding
    const embedding = await this.embeddingService.embed(content);
    
    // Create memory ID
    const id = uuidv4();
    
    // Prepare metadata (Pinecone requires flat structure)
    const flatMetadata: Record<string, string | number> = {
      content,
      timestamp: Date.now(),
      userId: metadata.userId || 'default',
      conversationId: metadata.conversationId || 'default',
      messageType: metadata.messageType || 'user',
      importance: metadata.importance || 0.5,
      category: (metadata as any).category || 'general'
    };

    // Add tags as comma-separated string
    if (metadata.tags && metadata.tags.length > 0) {
      flatMetadata.tags = metadata.tags.join(',');
    }

    // Upsert to Pinecone
    await this.index.upsert([{
      id,
      values: embedding,
      metadata: flatMetadata
    }]);

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
    const vectors: any[] = [];

    for (const item of items) {
      const embedding = await this.embeddingService.embed(item.content);
      const id = uuidv4();
      ids.push(id);

      const flatMetadata: Record<string, string | number> = {
        content: item.content,
        timestamp: Date.now(),
        userId: item.metadata?.userId || 'default',
        conversationId: item.metadata?.conversationId || 'default',
        messageType: item.metadata?.messageType || 'user',
        importance: item.metadata?.importance || 0.5,
        category: (item.metadata as any)?.category || 'general'
      };

      if (item.metadata?.tags && item.metadata.tags.length > 0) {
        flatMetadata.tags = item.metadata.tags.join(',');
      }

      vectors.push({
        id,
        values: embedding,
        metadata: flatMetadata
      });
    }

    // Batch upsert (Pinecone supports up to 100 vectors per request)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await this.index.upsert(batch);
    }

    console.log(`✅ Stored ${ids.length} memories`);
    return ids;
  }

  /**
   * READ: Retrieve memories using RAG (semantic search)
   */
  async retrieve(
    query: string,
    options: {
      topK?: number;
      filter?: Partial<MemoryMetadata>;
      threshold?: number;
    } = {}
  ): Promise<MemoryResult[]> {
    const { topK = 5, filter, threshold = 0.3 } = options;  // Lower default threshold for better recall
    
    console.log(`🔍 Retrieving memories for: "${query.slice(0, 50)}..."`);
    
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embed(query);
    
    // Build Pinecone filter
    const pineconeFilter: Record<string, any> = {};
    if (filter?.userId) {
      pineconeFilter.userId = { $eq: filter.userId };
    }
    if (filter?.conversationId) {
      pineconeFilter.conversationId = { $eq: filter.conversationId };
    }
    if ((filter as any)?.category) {
      pineconeFilter.category = { $eq: (filter as any).category };
    }

    // Query Pinecone
    const queryResponse = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined
    });

    // Convert to MemoryResult format
    const results: MemoryResult[] = [];
    
    for (const match of queryResponse.matches || []) {
      if (match.score && match.score >= threshold) {
        const metadata = match.metadata as any;
        
        const memory: Memory = {
          id: match.id,
          content: metadata.content,
          embedding: match.values || [],
          metadata: {
            userId: metadata.userId,
            conversationId: metadata.conversationId,
            messageType: metadata.messageType,
            importance: metadata.importance,
            tags: metadata.tags ? metadata.tags.split(',') : []
          },
          timestamp: metadata.timestamp
        };

        results.push({
          memory,
          similarity: match.score
        });
      }
    }

    console.log(`✅ Retrieved ${results.length} memories`);
    return results;
  }

  /**
   * UPDATE: Update a memory
   */
  async update(id: string, content: string, metadata?: MemoryMetadata): Promise<void> {
    console.log(`🔄 Updating memory: ${id.slice(0, 8)}...`);
    
    // Generate new embedding
    const embedding = await this.embeddingService.embed(content);
    
    // Prepare metadata
    const flatMetadata: Record<string, string | number> = {
      content,
      timestamp: Date.now(),
      userId: metadata?.userId || 'default',
      conversationId: metadata?.conversationId || 'default',
      messageType: metadata?.messageType || 'user',
      importance: metadata?.importance || 0.5,
      category: (metadata as any)?.category || 'general'
    };

    if (metadata?.tags && metadata.tags.length > 0) {
      flatMetadata.tags = metadata.tags.join(',');
    }

    // Upsert (update or insert)
    await this.index.upsert([{
      id,
      values: embedding,
      metadata: flatMetadata
    }]);

    console.log(`✅ Memory updated: ${id.slice(0, 8)}...`);
  }

  /**
   * DELETE: Delete a memory by ID
   */
  async delete(id: string): Promise<void> {
    console.log(`🗑️  Deleting memory: ${id.slice(0, 8)}...`);
    
    await this.index.deleteOne(id);
    
    console.log(`✅ Memory deleted: ${id.slice(0, 8)}...`);
  }

  /**
   * DELETE BATCH: Delete multiple memories
   */
  async deleteBatch(ids: string[]): Promise<void> {
    console.log(`🗑️  Deleting ${ids.length} memories...`);
    
    await this.index.deleteMany(ids);
    
    console.log(`✅ Deleted ${ids.length} memories`);
  }

  /**
   * DELETE ALL: Delete all memories for a user
   */
  async deleteAllForUser(userId: string): Promise<void> {
    console.log(`🗑️  Deleting all memories for user: ${userId}...`);
    
    // Pinecone delete by filter
    await this.index.deleteMany({
      userId: { $eq: userId }
    });
    
    console.log(`✅ Deleted all memories for user: ${userId}`);
  }

  /**
   * GET STATS: Get index statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    dimension: number;
    indexName: string;
  }> {
    const stats = await this.index.describeIndexStats();
    
    return {
      totalVectors: stats.totalRecordCount || 0,
      dimension: this.dimension,
      indexName: this.indexName
    };
  }

  /**
   * RAG: Retrieve and Generate (full RAG pipeline)
   */
  async retrieveAndGenerate(
    query: string,
    llmProvider: any,
    options: {
      topK?: number;
      filter?: Partial<MemoryMetadata>;
      threshold?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{
    response: string;
    memories: MemoryResult[];
    context: string;
  }> {
    // 1. RETRIEVE: Get relevant memories
    const memories = await this.retrieve(query, {
      topK: options.topK || 5,
      filter: options.filter,
      threshold: options.threshold || 0.3  // Lower default threshold
    });

    // 2. BUILD CONTEXT: Format memories for LLM
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

    // 3. GENERATE: Get LLM response
    const response = await llmProvider.generateResponse(context);

    return {
      response,
      memories,
      context
    };
  }
}
