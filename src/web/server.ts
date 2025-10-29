/**
 * Simple HTTP server to serve the memory dashboard
 * with live data from Pinecone
 */

import 'dotenv/config';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PineconeRAG } from '../rag/PineconeRAG.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Initialize Pinecone RAG
let rag: PineconeRAG | null = null;

async function initializeRAG() {
  const pineconeKey = process.env.PINECONE_API_KEY;
  
  if (pineconeKey) {
    try {
      rag = new PineconeRAG({
        apiKey: pineconeKey,
        indexName: 'supermemory',
        dimension: 384
      });
      await rag.initialize();
      console.log('✅ Pinecone RAG initialized for dashboard');
    } catch (error) {
      console.error('⚠️  Pinecone initialization failed:', error);
    }
  }
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve chat UI at root
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Serve dashboard
  if (req.url === '/dashboard' || req.url === '/memory-dashboard-live.html') {
    const htmlPath = path.join(__dirname, 'memory-dashboard-live.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // API: Get all memories
  if (req.url?.startsWith('/api/memories') && req.method === 'GET') {
    try {
      if (!rag) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Pinecone not initialized' }));
        return;
      }

      // Parse URL to get userId parameter
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const userId = url.searchParams.get('userId') || 'default-user';

      // Retrieve all memories (empty query with low threshold)
      const memories = await rag.retrieve('', {
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

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        memories: grouped,
        total: memories.length
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    }
    return;
  }

  // API: Chat endpoint
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        if (!rag) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Pinecone not initialized' }));
          return;
        }

        const data = JSON.parse(body);
        const message = data.message || '';
        const userId = data.userId || 'default-user';
        const history = data.history || [];

        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message is required' }));
          return;
        }

        const openrouterKey = process.env.OPENROUTER_API_KEY;
        if (!openrouterKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }));
          return;
        }

        const { OpenRouterProvider } = await import('../providers/OpenRouterProvider.js');
        const { SmartMemoryFilter } = await import('../core/SmartMemoryFilter.js');
        
        const llm = new OpenRouterProvider(openrouterKey, 'qwen/qwen-2.5-72b-instruct');
        const smartFilter = new SmartMemoryFilter(llm);

        let contextPrompt = `You are a helpful AI assistant with perfect memory.\n\n` +
          `IMPORTANT INSTRUCTIONS:\n` +
          `1. Use the RELEVANT MEMORIES section to understand the user's context and history\n` +
          `2. Use the CURRENT CONVERSATION section to maintain context within this session\n` +
          `3. Be concise and helpful.\n`;

        if (history.length > 0) {
          contextPrompt += '\n=== CURRENT CONVERSATION ===\n\n';
          history.slice(-10).forEach((m: any) => {
            contextPrompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
          });
        }

        const result = await rag.retrieveAndGenerate(message, llm, {
          topK: 10,
          filter: { userId },
          threshold: 0.3,
          systemPrompt: contextPrompt,
        });

        // Smart filter store
        const decision = await smartFilter.analyzeConversation(message, result.response);
        let storageInfo = null;
        
        if (decision.shouldStore) {
          await rag.create(message, { userId, conversationId: data.conversationId || 'web', importance: decision.importance, category: decision.category as any });
          await rag.create(result.response, { userId, conversationId: data.conversationId || 'web', messageType: 'assistant', importance: decision.importance, category: decision.category as any });
          
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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          response: result.response,
          memoriesUsed: result.memories.length,
          contextPreview: result.context?.slice(0, 800) || '',
          storageInfo: storageInfo
        }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(error?.message || error) }));
      }
    });
    return;
  }

  // API: Get stats
  if (req.url === '/api/stats' && req.method === 'GET') {
    try {
      if (!rag) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Pinecone not initialized' }));
        return;
      }

      const stats = await rag.getStats();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        stats
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    }
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

async function start() {
  console.log('🚀 Starting Memory Dashboard Server...\n');
  
  await initializeRAG();
  
  server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     🧠 SUPERMEMORY DASHBOARD - LIVE VISUALIZATION     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api/memories\n`);
    console.log('Press Ctrl+C to stop\n');
  });
}

start().catch(console.error);
