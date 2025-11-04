import type { Handler } from '@netlify/functions';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeRAG } from '../../src/rag/PineconeRAG';
import { OpenRouterProvider } from '../../src/providers/OpenRouterProvider';
import { SmartMemoryFilter } from '../../src/core/SmartMemoryFilter';
import { EmbeddingService } from '../../src/embedding/EmbeddingService';

let rag: PineconeRAG | null = null;
let pinecone: Pinecone | null = null;
let embeddingService: EmbeddingService | null = null;
let initialized = false;

async function ensureInit() {
  if (initialized) return;
  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!pineconeKey) throw new Error('Missing PINECONE_API_KEY');
  
  // Initialize RAG for storing new memories
  rag = new PineconeRAG({ apiKey: pineconeKey, indexName: 'supermemory', dimension: 384 });
  await rag.initialize();
  
  // Initialize Pinecone client for multi-index retrieval
  pinecone = new Pinecone({ apiKey: pineconeKey });
  
  // Initialize embedding service for query embeddings
  embeddingService = new EmbeddingService();
  await embeddingService.initialize();
  
  initialized = true;
}

export const handler: Handler = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Method Not Allowed' }) 
      };
    }

    await ensureInit();

    const body = JSON.parse(event.body || '{}');
    const message: string = body.message || '';
    const userId: string = body.userId || 'default-user';
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = body.history || [];

    if (!message) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'message is required' }) 
      };
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }) 
      };
    }

    const llm = new OpenRouterProvider(openrouterKey, 'qwen/qwen-2.5-72b-instruct');
    const smartFilter = new SmartMemoryFilter(llm);

    let contextPrompt = `You are a helpful AI assistant with perfect memory.\n\n` +
      `IMPORTANT INSTRUCTIONS:\n` +
      `1. Use the RELEVANT MEMORIES section to understand the user's context and history\n` +
      `2. Use the CURRENT CONVERSATION section to maintain context within this session\n` +
      `3. Be concise and helpful.\n`;

    if (history.length > 0) {
      contextPrompt += '\n=== CURRENT CONVERSATION ===\n\n';
      history.slice(-10).forEach(m => {
        contextPrompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
      });
    }

    // Retrieve memories from ALL indexes
    const indexList = await pinecone!.listIndexes();
    const supermemoryIndexes = indexList.indexes?.filter((idx: any) => 
      idx.name.includes('supermemory')
    ) || [];

    console.log('Querying indexes:', supermemoryIndexes.map((i: any) => i.name));

    // Generate query embedding
    const queryEmbedding = await embeddingService!.embed(message);
    
    const allMemories: any[] = [];

    // Query each index with appropriate dimension
    for (const idx of supermemoryIndexes) {
      try {
        const index = pinecone!.index(idx.name);
        
        // For 384-dim index, use our query embedding directly
        // For other dims, use a zero vector (less accurate but includes all data)
        const queryVector = idx.dimension === 384 
          ? queryEmbedding 
          : new Array(idx.dimension).fill(0);
        
        const queryResponse = await index.query({
          vector: queryVector,
          topK: 10,
          includeMetadata: true,
          filter: { userId: { $eq: userId } }
        });

        for (const match of queryResponse.matches || []) {
          const metadata = match.metadata as any;
          if (metadata.content && match.score && match.score >= 0.3) {
            allMemories.push({
              id: match.id,
              content: metadata.content,
              similarity: match.score,
              timestamp: metadata.timestamp || Date.now(),
              importance: metadata.importance || 0.5,
              category: metadata.category || 'general'
            });
          }
        }
      } catch (err) {
        console.error(`Error querying index ${idx.name}:`, err);
      }
    }

    // Sort by similarity and take top 10
    allMemories.sort((a, b) => b.similarity - a.similarity);
    const topMemories = allMemories.slice(0, 10);

    console.log(`Retrieved ${topMemories.length} memories from ${supermemoryIndexes.length} indexes`);

    // Build context with memories
    let fullContext = contextPrompt + '\n\n=== RELEVANT MEMORIES ===\n\n';
    if (topMemories.length > 0) {
      topMemories.forEach((mem, idx) => {
        const date = new Date(mem.timestamp).toLocaleString();
        fullContext += `[Memory ${idx + 1}] (Relevance: ${(mem.similarity * 100).toFixed(1)}%)\n`;
        fullContext += `Time: ${date}\n`;
        fullContext += `Content: ${mem.content}\n\n`;
      });
    } else {
      fullContext += 'No relevant memories found.\n\n';
    }
    fullContext += '=== END MEMORIES ===\n\n';
    fullContext += `Current Query: ${message}`;

    // Generate response with LLM
    const response = await llm.generateResponse(fullContext);

    const result = {
      response,
      memories: topMemories,
      context: fullContext
    };

    // Smart filter store
    const decision = await smartFilter.analyzeConversation(message, result.response);
    let storageInfo = null;
    
    if (decision.shouldStore) {
      await rag!.create(message, { userId, conversationId: body.conversationId || 'web', importance: decision.importance, category: decision.category as any });
      await rag!.create(result.response, { userId, conversationId: body.conversationId || 'web', messageType: 'assistant', importance: decision.importance, category: decision.category as any });
      
      storageInfo = {
        stored: true,
        category: decision.category,
        importance: Math.round(decision.importance * 100),
        reasoning: decision.reasoning,
        facts: decision.extractedFacts || []
      };
    } else {
      storageInfo = {
        stored: false,
        reasoning: decision.reasoning
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: true,
        response: result.response,
        memoriesUsed: result.memories.length,
        contextPreview: result.context?.slice(0, 800) || '',
        storageInfo,
      })
    };
  } catch (e: any) {
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String(e?.message || e) }) 
    };
  }
};
