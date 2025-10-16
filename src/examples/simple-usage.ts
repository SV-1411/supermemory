/**
 * Simple Usage Example - Just the core Supermemory functionality
 * No LLM required - pure memory storage and retrieval
 */

import { Supermemory } from '../core/Supermemory.js';

async function simpleExample() {
  console.log('🧠 Simple Supermemory Example\n');

  // 1. Create and initialize
  const memory = new Supermemory({
    storagePath: './data/simple-demo'
  });

  await memory.initialize();

  // 2. Store memories
  console.log('📝 Storing memories...\n');

  await memory.remember(
    "I love pizza, especially margherita",
    { userId: 'user123', tags: ['food', 'preference'] }
  );

  await memory.remember(
    "My favorite color is blue",
    { userId: 'user123', tags: ['preference'] }
  );

  await memory.remember(
    "I'm learning TypeScript and building AI applications",
    { userId: 'user123', tags: ['learning', 'tech'] }
  );

  await memory.remember(
    "I work as a software engineer in San Francisco",
    { userId: 'user123', tags: ['work', 'location'] }
  );

  console.log(`✅ Stored ${memory.getStats().totalMemories} memories\n`);

  // 3. Recall memories semantically
  console.log('🔍 Semantic Search Examples:\n');

  // Example 1: Food preferences
  console.log('Query: "What food do I like?"');
  const foodMemories = await memory.recall({
    query: "What food do I like?",
    topK: 2
  });

  foodMemories.forEach(result => {
    console.log(`  ✓ [${(result.similarity * 100).toFixed(1)}%] ${result.memory.content}`);
  });

  // Example 2: Work info
  console.log('\nQuery: "Where do I work?"');
  const workMemories = await memory.recall({
    query: "Where do I work?",
    topK: 2
  });

  workMemories.forEach(result => {
    console.log(`  ✓ [${(result.similarity * 100).toFixed(1)}%] ${result.memory.content}`);
  });

  // Example 3: Skills
  console.log('\nQuery: "What am I learning?"');
  const skillMemories = await memory.recall({
    query: "What am I learning?",
    topK: 2
  });

  skillMemories.forEach(result => {
    console.log(`  ✓ [${(result.similarity * 100).toFixed(1)}%] ${result.memory.content}`);
  });

  // 4. Filter by metadata
  console.log('\n\n🏷️  Filtered Search (only "preference" tags):\n');
  const prefMemories = await memory.recall({
    query: "Tell me about the user",
    topK: 5,
    filter: { tags: ['preference'] }
  });

  prefMemories.forEach(result => {
    console.log(`  ✓ ${result.memory.content}`);
  });

  // 5. Build LLM context
  console.log('\n\n🤖 LLM Context Example:\n');
  const context = await memory.buildLLMContext(
    "What are my hobbies and interests?",
    {
      topK: 3,
      systemPrompt: "You are a helpful personal assistant."
    }
  );

  const formattedPrompt = memory.formatContextForPrompt(context);
  console.log(formattedPrompt);

  // 6. Save to disk
  await memory.save();
  console.log('\n\n💾 Memories saved to disk!');
  console.log('   You can restart and memories will persist.\n');
}

// Run the example
simpleExample().catch(console.error);
