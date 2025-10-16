/**
 * Vector Store - Handles storage and retrieval using FAISS
 * FAISS is free, local, and extremely fast for similarity search
 */

import { IndexFlatL2 } from 'faiss-node';
import { Memory, MemoryResult, MemoryMetadata } from '../types/index.js';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import * as fs from 'fs';
import * as path from 'path';

export class VectorStore {
  private index: IndexFlatL2 | null = null;
  private memories: Memory[] = [];
  private dimension: number;
  private storagePath: string;

  constructor(dimension: number = 384, storagePath: string = './data') {
    this.dimension = dimension;
    this.storagePath = storagePath;
    this.ensureStorageDirectory();
  }

  /**
   * Initialize the FAISS index
   */
  async initialize(): Promise<void> {
    this.index = new IndexFlatL2(this.dimension);
    console.log(`✅ Vector store initialized with dimension ${this.dimension}`);
    
    // Try to load existing memories
    await this.loadFromDisk();
  }

  /**
   * Add a memory to the vector store
   */
  async add(memory: Memory): Promise<void> {
    if (!this.index) {
      throw new Error('Vector store not initialized');
    }

    // Add to FAISS index
    this.index.add(memory.embedding);
    
    // Store memory metadata
    this.memories.push(memory);

    console.log(`💾 Memory added: ${memory.id.slice(0, 8)}... (Total: ${this.memories.length})`);
  }

  /**
   * Add multiple memories in batch
   */
  async addBatch(memories: Memory[]): Promise<void> {
    if (!this.index) {
      throw new Error('Vector store not initialized');
    }

    for (const memory of memories) {
      await this.add(memory);
    }
  }

  /**
   * Search for similar memories using vector similarity
   */
  async search(
    queryEmbedding: number[],
    topK: number = 5,
    filter?: Partial<MemoryMetadata>
  ): Promise<MemoryResult[]> {
    if (!this.index) {
      throw new Error('Vector store not initialized');
    }

    if (this.memories.length === 0) {
      return [];
    }

    // Search in FAISS
    const k = Math.min(topK * 3, this.memories.length); // Get more results for filtering
    const result = this.index.search(queryEmbedding, k);

    // Map indices to memories and calculate similarity scores
    const results: MemoryResult[] = [];
    
    for (let i = 0; i < result.labels.length; i++) {
      const idx = result.labels[i];
      const distance = result.distances[i];
      
      if (idx >= 0 && idx < this.memories.length) {
        const memory = this.memories[idx];
        
        // Apply metadata filter if provided
        if (filter && !this.matchesFilter(memory.metadata, filter)) {
          continue;
        }

        // Convert L2 distance to similarity score (0-1)
        // Lower distance = higher similarity
        const similarity = 1 / (1 + distance);

        results.push({
          memory,
          similarity
        });

        if (results.length >= topK) break;
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
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
    this.index = new IndexFlatL2(this.dimension);
    this.memories = [];
    console.log('🗑️  All memories cleared');
  }

  /**
   * Save memories to disk
   */
  async saveToDisk(): Promise<void> {
    const dataPath = path.join(this.storagePath, 'memories.json');
    const indexPath = path.join(this.storagePath, 'faiss.index');

    // Save memories metadata
    fs.writeFileSync(dataPath, JSON.stringify(this.memories, null, 2));

    // Save FAISS index
    if (this.index && this.memories.length > 0) {
      this.index.write(indexPath);
    }

    console.log(`💾 Saved ${this.memories.length} memories to disk`);
  }

  /**
   * Load memories from disk
   */
  async loadFromDisk(): Promise<void> {
    const dataPath = path.join(this.storagePath, 'memories.json');
    const indexPath = path.join(this.storagePath, 'faiss.index');

    try {
      if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf-8');
        this.memories = JSON.parse(data);

        // Rebuild FAISS index from embeddings
        if (this.memories.length > 0 && fs.existsSync(indexPath)) {
          this.index = IndexFlatL2.read(indexPath);
          console.log(`📂 Loaded ${this.memories.length} memories from disk`);
        }
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
