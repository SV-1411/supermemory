import type { Handler } from '@netlify/functions';
import { Pinecone } from '@pinecone-database/pinecone';

let pinecone: Pinecone | null = null;

async function ensurePinecone() {
  if (pinecone) return pinecone;
  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!pineconeKey) throw new Error('Missing PINECONE_API_KEY');
  pinecone = new Pinecone({ apiKey: pineconeKey });
  return pinecone;
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

    const pc = await ensurePinecone();
    const userId = event.queryStringParameters?.userId || 'default-user';

    // List all supermemory indexes
    const indexList = await pc.listIndexes();
    const supermemoryIndexes = indexList.indexes?.filter((idx: any) => 
      idx.name.includes('supermemory')
    ) || [];

    console.log('Found indexes:', supermemoryIndexes.map((i: any) => i.name));

    const allMemories: any[] = [];

    // Query each index
    for (const idx of supermemoryIndexes) {
      try {
        const index = pc.index(idx.name);
        
        // Query with zero vector to get all memories
        const queryResponse = await index.query({
          vector: new Array(idx.dimension).fill(0),
          topK: 100,
          includeMetadata: true,
          filter: { userId: { $eq: userId } }
        });

        // Convert to memory format
        for (const match of queryResponse.matches || []) {
          const metadata = match.metadata as any;
          if (metadata.content) {
            allMemories.push({
              id: match.id,
              content: metadata.content,
              category: metadata.category || 'general',
              importance: metadata.importance || 0.5,
              timestamp: metadata.timestamp || Date.now(),
              userId: metadata.userId || userId
            });
          }
        }
      } catch (err) {
        console.error(`Error querying index ${idx.name}:`, err);
      }
    }

    // Group by category
    const grouped = {
      personal: [] as any[],
      preference: [] as any[],
      project: [] as any[],
      question: [] as any[],
      general: [] as any[]
    };

    allMemories.forEach(mem => {
      const category = mem.category || 'general';
      if (grouped[category as keyof typeof grouped]) {
        grouped[category as keyof typeof grouped].push(mem);
      } else {
        grouped.general.push(mem);
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
        total: allMemories.length
      })
    };
  } catch (error: any) {
    console.error('Error in memories function:', error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false,
        error: String(error?.message || error) 
      })
    };
  }
};
