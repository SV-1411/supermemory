/**
 * Simple HTTP server to serve the memory dashboard
 * with live data from Pinecone
 */

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

  // Serve dashboard HTML
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, 'memory-dashboard-live.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // API: Get all memories
  if (req.url === '/api/memories' && req.method === 'GET') {
    try {
      if (!rag) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Pinecone not initialized' }));
        return;
      }

      // Retrieve all memories (empty query with low threshold)
      const memories = await rag.retrieve('', {
        topK: 100,
        threshold: 0
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
