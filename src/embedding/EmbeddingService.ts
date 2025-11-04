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
    // Keep a stable dimension (384) so Pinecone index does not need to change
    return 384;
  }

  private async embedRemote(text: string): Promise<number[]> {
    // Provider selection: allow override, otherwise prefer Cohere -> HuggingFace -> OpenAI
    const providerPref = (process.env.SUPERMEMORY_EMBEDDING_PROVIDER || '').toLowerCase();
    const hasCohere = !!process.env.COHERE_API_KEY;
    const hasHF = !!process.env.HF_API_TOKEN;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    const chooseProvider = (): 'cohere' | 'hf' | 'openai' => {
      if (providerPref === 'cohere' && hasCohere) return 'cohere';
      if (providerPref === 'hf' && hasHF) return 'hf';
      if (providerPref === 'openai' && hasOpenAI) return 'openai';
      if (hasCohere) return 'cohere';
      if (hasHF) return 'hf';
      if (hasOpenAI) return 'openai';
      throw new Error('No embedding provider configured. Set COHERE_API_KEY or HF_API_TOKEN (or OPENAI_API_KEY).');
    };

    const provider = chooseProvider();

    if (provider === 'cohere') {
      // Cohere: embed-english-light-v3.0 returns 384-dim vectors
      const resp = await fetch('https://api.cohere.com/v1/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`
        },
        body: JSON.stringify({
          texts: [text],
          model: 'embed-english-light-v3.0',
          input_type: 'search_document'
        })
      });
      const txt = await resp.text();
      let json: any = null; try { json = JSON.parse(txt); } catch {}
      if (!resp.ok) {
        const message = json?.message || json?.error || txt || 'Unknown error';
        throw new Error(`Remote embedding failed (Cohere): ${resp.status} ${message}`);
      }
      const vec = json?.embeddings?.[0];
      if (!Array.isArray(vec)) {
        throw new Error(`Remote embedding response missing embeddings (Cohere): ${txt.slice(0, 300)}`);
      }
      return vec as number[];
    }

    if (provider === 'hf') {
      // Hugging Face Inference API: sentence-transformers/all-MiniLM-L6-v2 (384-dim). Returns token embeddings; pool mean.
      const resp = await fetch('https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HF_API_TOKEN}`
        },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
      });
      const txt = await resp.text();
      let json: any = null; try { json = JSON.parse(txt); } catch {}
      if (!resp.ok) {
        const message = json?.error || txt || 'Unknown error';
        throw new Error(`Remote embedding failed (HF): ${resp.status} ${message}`);
      }
      // Shape can be [tokens][dims] or [dims]
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const tokenEmbeds: number[][] = json as number[][];
        const dims = tokenEmbeds[0].length;
        const sums = new Array(dims).fill(0);
        for (const token of tokenEmbeds) {
          for (let i = 0; i < dims; i++) sums[i] += token[i];
        }
        return sums.map(s => s / tokenEmbeds.length);
      } else if (Array.isArray(json)) {
        return json as number[];
      }
      throw new Error(`Unexpected HF embedding response shape: ${txt.slice(0, 300)}`);
    }

    // Fallback to OpenAI if configured (down-project 1536 -> 384 to keep Pinecone dim stable)
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ input: text, model: 'text-embedding-3-small' })
    });
    const txt = await resp.text();
    let json: any = null; try { json = JSON.parse(txt); } catch {}
    if (!resp.ok) {
      const message = json?.error?.message || txt || 'Unknown error';
      throw new Error(`Remote embedding failed (OpenAI): ${resp.status} ${message}`);
    }
    const vec = json?.data?.[0]?.embedding as number[] | undefined;
    if (!Array.isArray(vec)) {
      throw new Error(`Remote embedding response missing data (OpenAI): ${txt.slice(0, 300)}`);
    }
    // Down-project 1536 -> 384 by averaging non-overlapping windows of 4
    const factor = Math.floor(vec.length / 384) || 1;
    const out = new Array(384).fill(0);
    for (let i = 0; i < 384; i++) {
      let sum = 0; let cnt = 0;
      for (let j = 0; j < factor; j++) {
        const idx = i * factor + j;
        if (idx < vec.length) { sum += vec[idx]; cnt++; }
      }
      out[i] = cnt ? (sum / cnt) : 0;
    }
    return out;
  }
}
