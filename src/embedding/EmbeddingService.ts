/**
 * Embedding Service - Converts text to vectors using local transformers
 * Uses Xenova/transformers (runs locally, 100% free)
 */

import type { Pipeline } from '@xenova/transformers';

export class EmbeddingService {
  private model: any | null = null;
  private modelName: string;
  private isInitialized: boolean = false;
  private useRemote: boolean = false;

  constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2') {
    // all-MiniLM-L6-v2: 384 dimensions, fast, good for semantic search
    this.modelName = modelName;
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // If running in serverless (e.g., Netlify) or explicitly forced, skip local model entirely
    const forceRemote = process.env.SUPERMEMORY_FORCE_REMOTE === '1' || process.env.NETLIFY === 'true';
    if (forceRemote) {
      console.warn('⚠️ Forcing remote embeddings in serverless environment');
      this.useRemote = true;
      this.isInitialized = true;
      return;
    }

    try {
      console.log(`🧠 Loading embedding model: ${this.modelName}...`);
      // Dynamic import to work in Netlify Functions (ESM-only module)
      const { pipeline } = await import('@xenova/transformers');
      this.model = await pipeline('feature-extraction', this.modelName);
      this.isInitialized = true;
      this.useRemote = false;
      console.log('✅ Embedding model loaded successfully');
    } catch (err) {
      // Fallback to remote embeddings to avoid native deps (sharp/libvips) on serverless
      const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      if (!hasOpenRouter && !hasOpenAI) {
        console.error('❌ Failed to load local embeddings and neither OPENROUTER_API_KEY nor OPENAI_API_KEY is set for remote fallback');
        throw err;
      }
      console.warn('⚠️ Falling back to remote embeddings via ' + (hasOpenRouter ? 'OpenRouter' : 'OpenAI'));
      this.useRemote = true;
      this.isInitialized = true;
    }
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.model) {
      await this.initialize();
    }
    if (this.useRemote) {
      return await this.embedRemote(text);
    } else {
      const output = await this.model!(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data as Float32Array);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized || !this.model) {
      await this.initialize();
    }
    if (this.useRemote) {
      const out: number[][] = [];
      for (const t of texts) {
        out.push(await this.embedRemote(t));
      }
      return out;
    } else {
      const embeddings: number[][] = [];
      // Process in batches to avoid memory issues
      for (const text of texts) {
        const embedding = await this.embed(text);
        embeddings.push(embedding);
      }
      return embeddings;
    }
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
    // Local model produces 384 dims; remote OpenAI text-embedding-3-small produces 1536 dims
    return this.useRemote ? 1536 : 384;
  }

  private async embedRemote(text: string): Promise<number[]> {
    const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const url = useOpenRouter
      ? 'https://openrouter.ai/api/v1/embeddings'
      : 'https://api.openai.com/v1/embeddings';
    const apiKey = useOpenRouter
      ? (process.env.OPENROUTER_API_KEY as string)
      : (process.env.OPENAI_API_KEY as string);

    // For OpenRouter, model name should be vendor-prefixed
    const model = useOpenRouter ? 'openai/text-embedding-3-small' : 'text-embedding-3-small';

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ input: text, model })
    });

    const txt = await resp.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch { /* ignore */ }

    if (!resp.ok) {
      // Prefer structured error if present
      const message = json?.error?.message || txt || 'Unknown error';
      throw new Error(`Remote embedding failed: ${resp.status} ${message}`);
    }

    if (!json || !Array.isArray(json.data) || !json.data[0]?.embedding) {
      throw new Error(`Remote embedding response missing data: ${txt.slice(0, 300)}`);
    }
    return json.data[0].embedding as number[];
  }
}
