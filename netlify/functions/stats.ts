import type { Handler } from '@netlify/functions';
import { PineconeRAG } from '../../src/rag/PineconeRAG.js';

let rag: PineconeRAG | null = null;
let initialized = false;

async function ensureInit() {
  if (initialized) return;
  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!pineconeKey) throw new Error('Missing PINECONE_API_KEY');
  rag = new PineconeRAG({ apiKey: pineconeKey, indexName: 'supermemory', dimension: 384 });
  await rag.initialize();
  initialized = true;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    await ensureInit();

    const stats = await rag!.getStats();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        stats
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error: any) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: String(error?.message || error) }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
