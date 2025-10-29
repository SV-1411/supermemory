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

    const userId = event.queryStringParameters?.userId || 'default-user';

    // Retrieve all memories (empty query with low threshold)
    const memories = await rag!.retrieve('', {
      topK: 100,
      threshold: 0,
      filter: { userId }
    });

    // Group by category
    const grouped = {
      personal: [] as any[],
      preference: [] as any[],
      project: [] as any[],
      question: [] as any[],
      general: [] as any[]
    };

    memories.forEach(result => {
      const category = (result.memory.metadata as any).category || 'general';
      const item = {
        id: result.memory.id,
        content: result.memory.content,
        category,
        importance: result.memory.metadata.importance || 0.5,
        timestamp: result.memory.timestamp,
        userId: result.memory.metadata.userId
      };

      if (grouped[category as keyof typeof grouped]) {
        grouped[category as keyof typeof grouped].push(item);
      } else {
        grouped.general.push(item);
      }
    });

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        memories: grouped,
        total: memories.length
      })
    };
  } catch (error: any) {
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String(error?.message || error) })
    };
  }
};
