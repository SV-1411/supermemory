/**
 * Example: OpenAI Integration with Supermemory
 * 
 * To use: Set OPENAI_API_KEY environment variable
 * npm install openai (optional, only if you want to use OpenAI)
 */

import { Supermemory } from '../core/Supermemory.js';
import { AgentOrchestrator, LLMProvider } from '../orchestrator/AgentOrchestrator.js';

/**
 * OpenAI LLM Provider
 * Note: This requires the 'openai' package and API key
 */
class OpenAIProvider implements LLMProvider {
  name = 'OpenAI GPT';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(prompt: string): Promise<string> {
    // This is a placeholder - you'll need to install 'openai' package
    // and implement actual API call
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

/**
 * Example usage
 */
async function main() {
  // Initialize Supermemory
  const supermemory = new Supermemory({
    storagePath: './data/openai-demo'
  });

  await supermemory.initialize();

  // Create orchestrator
  const orchestrator = new AgentOrchestrator(supermemory);

  // Set OpenAI as LLM provider (requires API key)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Please set OPENAI_API_KEY environment variable');
    return;
  }

  orchestrator.setLLMProvider(new OpenAIProvider(apiKey));

  // Example conversation
  console.log('\n🗣️  Starting conversation with memory...\n');

  // First interaction
  const response1 = await orchestrator.processQuery(
    "My name is Shivansh and I'm working on a gender detection AI project using object detection.",
    { conversationId: 'demo-1' }
  );
  console.log('Assistant:', response1.response);
  console.log(`(Used ${response1.memoriesUsed} memories)\n`);

  // Second interaction - AI should remember
  const response2 = await orchestrator.processQuery(
    "What project am I working on?",
    { conversationId: 'demo-1' }
  );
  console.log('Assistant:', response2.response);
  console.log(`(Used ${response2.memoriesUsed} memories)\n`);

  // Save memories
  await orchestrator.save();
  console.log('✅ Memories saved!');
}

// Uncomment to run
// main().catch(console.error);
