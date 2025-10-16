/**
 * Embedding Service - Converts text to vectors using local transformers
 * Uses Xenova/transformers (runs locally, 100% free)
 */

import { pipeline, Pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private model: Pipeline | null = null;
  private modelName: string;
  private isInitialized: boolean = false;

  constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2') {
    // all-MiniLM-L6-v2: 384 dimensions, fast, good for semantic search
    this.modelName = modelName;
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`🧠 Loading embedding model: ${this.modelName}...`);
    this.model = await pipeline('feature-extraction', this.modelName);
    this.isInitialized = true;
    console.log('✅ Embedding model loaded successfully');
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.model) {
      await this.initialize();
    }

    const output = await this.model!(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized || !this.model) {
      await this.initialize();
    }

    const embeddings: number[][] = [];
    
    // Process in batches to avoid memory issues
    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
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

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get the dimension of embeddings produced by this model
   */
  getDimension(): number {
    // all-MiniLM-L6-v2 produces 384-dimensional embeddings
    return 384;
  }
}
