import type { Handler } from '@netlify/functions';
import { PineconeRAG } from '../../src/rag/PineconeRAG.js';
import { OpenRouterProvider } from '../../src/providers/OpenRouterProvider.js';
import { SmartMemoryFilter } from '../../src/core/SmartMemoryFilter.js';

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
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    await ensureInit();

    const body = JSON.parse(event.body || '{}');
    const message: string = body.message || '';
    const userId: string = body.userId || 'default-user';
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = body.history || [];

    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'message is required' }) };
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }) };
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

    const result = await rag!.retrieveAndGenerate(message, llm, {
      topK: 10,
      filter: { userId },
      threshold: 0.3,
      systemPrompt: contextPrompt,
    });

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
      body: JSON.stringify({
        ok: true,
        response: result.response,
        memoriesUsed: result.memories.length,
        contextPreview: result.context?.slice(0, 800) || '',
        storageInfo: storageInfo
      }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
};
