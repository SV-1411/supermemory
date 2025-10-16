/**
 * Example: Mock LLM Demo (No API key required)
 * This demonstrates the Supermemory system without needing any external LLM
 */

import { Supermemory } from '../core/Supermemory.js';
import { AgentOrchestrator, LLMProvider } from '../orchestrator/AgentOrchestrator.js';

/**
 * Mock LLM Provider - Simulates an AI response
 * Perfect for testing without API keys
 */
class MockLLMProvider implements LLMProvider {
  name = 'Mock AI (Demo)';

  async generateResponse(prompt: string): Promise<string> {
    // Simple mock response that shows it received the memories
    const hasMemories = prompt.includes('RELEVANT MEMORIES');
    const memoryCount = (prompt.match(/\[Memory \d+\]/g) || []).length;

    if (hasMemories) {
      return `I can see ${memoryCount} relevant memories from our previous conversations. Based on what I remember, I can help you with that!`;
    } else {
      return "This is my first time hearing about this. Tell me more!";
    }
  }
}

/**
 * Demo: Complete workflow
 */
async function runDemo() {
  console.log('🚀 Supermemory Demo - Mock LLM\n');
  console.log('=' .repeat(60));

  // 1. Initialize Supermemory
  const supermemory = new Supermemory({
    storagePath: './data/demo'
  });

  await supermemory.initialize();

  // 2. Create orchestrator with mock LLM
  const orchestrator = new AgentOrchestrator(supermemory);
  orchestrator.setLLMProvider(new MockLLMProvider());

  console.log('\n📝 Storing initial memories...\n');

  // 3. Store some initial information
  await supermemory.remember(
    "Shivansh is building Gigzs, a freelance marketplace platform",
    { userId: 'shivansh', tags: ['project', 'gigzs'] }
  );

  await supermemory.remember(
    "The tech stack includes TypeScript, React, and Node.js",
    { userId: 'shivansh', tags: ['tech', 'gigzs'] }
  );

  await supermemory.remember(
    "Shivansh prefers using free tools for MVP development",
    { userId: 'shivansh', tags: ['preference'] }
  );

  await supermemory.remember(
    "The Supermemory system uses FAISS for vector storage and Xenova transformers for embeddings",
    { tags: ['supermemory', 'tech'] }
  );

  console.log(`✅ Stored ${orchestrator.getStats().totalMemories} memories\n`);
  console.log('=' .repeat(60));

  // 4. Test semantic search
  console.log('\n🔍 Testing semantic search...\n');

  const queries = [
    "What is Shivansh working on?",
    "What technologies are being used?",
    "Tell me about the memory system",
    "What are the user preferences?"
  ];

  for (const query of queries) {
    console.log(`\n❓ Query: "${query}"`);
    
    const memories = await orchestrator.retrieveMemories(query, 2);
    
    console.log(`📚 Found ${memories.length} relevant memories:`);
    memories.forEach((result, idx) => {
      console.log(`   ${idx + 1}. [${(result.similarity * 100).toFixed(1)}%] ${result.memory.content.slice(0, 80)}...`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // 5. Test conversation with memory
  console.log('\n💬 Testing conversation with memory augmentation...\n');

  const response1 = await orchestrator.processQuery(
    "What project is Shivansh building?",
    { conversationId: 'test-conv' }
  );

  console.log(`User: "What project is Shivansh building?"`);
  console.log(`AI: ${response1.response}`);
  console.log(`   (Retrieved ${response1.memoriesUsed} memories)\n`);

  const response2 = await orchestrator.processQuery(
    "What tech stack should I use?",
    { conversationId: 'test-conv' }
  );

  console.log(`User: "What tech stack should I use?"`);
  console.log(`AI: ${response2.response}`);
  console.log(`   (Retrieved ${response2.memoriesUsed} memories)\n`);

  // 6. Show statistics
  console.log('='.repeat(60));
  console.log('\n📊 Final Statistics:\n');
  const stats = orchestrator.getStats();
  console.log(`   Total Memories: ${stats.totalMemories}`);
  console.log(`   Vector Dimension: ${stats.dimension}`);
  console.log(`   Storage Path: ${stats.storagePath}`);

  // 7. Save to disk
  await orchestrator.save();
  console.log('\n💾 All memories saved to disk!');
  console.log('\n✅ Demo complete!\n');
}

// Run the demo
runDemo().catch(console.error);
