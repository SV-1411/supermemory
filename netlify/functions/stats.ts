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

export const handler: Handler = async (event, _context) => {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    await ensureInit();

    const stats = await rag!.getStats();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, stats })
    };
  } catch (error: any) {
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String(error?.message || error) })
    };
  }
};
