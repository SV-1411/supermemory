/**
 * Simple Vector Store - Pure JavaScript implementation
 * No native dependencies, works everywhere!
 * Perfect for MVP and small to medium datasets (<100K vectors)
 */

import { Memory, MemoryResult, MemoryMetadata } from '../types/index.js';
import * as fs from 'fs';
import * as path from 'path';

export class SimpleVectorStore {
  private memories: Memory[] = [];
  private dimension: number;
  private storagePath: string;

  constructor(dimension: number = 384, storagePath: string = './data') {
    this.dimension = dimension;
    this.storagePath = storagePath;
    this.ensureStorageDirectory();
  }

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    console.log(`✅ Vector store initialized with dimension ${this.dimension}`);
    
    // Try to load existing memories
    await this.loadFromDisk();
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Add a memory to the vector store
   */
  async add(memory: Memory): Promise<void> {
    // Store memory
    this.memories.push(memory);

    console.log(`💾 Memory added: ${memory.id.slice(0, 8)}... (Total: ${this.memories.length})`);
  }

  /**
   * Add multiple memories in batch
   */
  async addBatch(memories: Memory[]): Promise<void> {
    for (const memory of memories) {
      await this.add(memory);
    }
  }

  /**
   * Search for similar memories using cosine similarity
   */
  async search(
    queryEmbedding: number[],
    topK: number = 5,
    filter?: Partial<MemoryMetadata>
  ): Promise<MemoryResult[]> {
    if (this.memories.length === 0) {
      return [];
    }

    // Calculate similarity for all memories
    const results: MemoryResult[] = [];
    
    for (const memory of this.memories) {
      // Apply metadata filter if provided
      if (filter && !this.matchesFilter(memory.metadata, filter)) {
        continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);

      results.push({
        memory,
        similarity
      });
    }

    // Sort by similarity (descending) and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Check if memory metadata matches filter
   */
  private matchesFilter(metadata: MemoryMetadata, filter: Partial<MemoryMetadata>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === 'tags' && Array.isArray(value)) {
        // Check if any tag matches
        const memoryTags = metadata.tags || [];
        if (!value.some(tag => memoryTags.includes(tag))) {
          return false;
        }
      } else if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all memories (for debugging/export)
   */
  getAllMemories(): Memory[] {
    return [...this.memories];
  }

  /**
   * Get memory count
   */
  getCount(): number {
    return this.memories.length;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories = [];
    console.log('🗑️  All memories cleared');
  }

  /**
   * Save memories to disk
   */
  async saveToDisk(): Promise<void> {
    const dataPath = path.join(this.storagePath, 'memories.json');

    // Save memories
    fs.writeFileSync(dataPath, JSON.stringify(this.memories, null, 2));

    console.log(`💾 Saved ${this.memories.length} memories to disk`);
  }

  /**
   * Load memories from disk
   */
  async loadFromDisk(): Promise<void> {
    const dataPath = path.join(this.storagePath, 'memories.json');

    try {
      if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf-8');
        this.memories = JSON.parse(data);
        console.log(`📂 Loaded ${this.memories.length} memories from disk`);
      }
    } catch (error) {
      console.error('Error loading memories from disk:', error);
    }
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }
}
