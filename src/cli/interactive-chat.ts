/**
 * Interactive Chat CLI - Chat with AI that remembers everything
 * This is what you actually use to talk to the AI!
 */

import * as readline from 'readline';
import { Supermemory } from '../core/Supermemory.js';
import { AgentOrchestrator, LLMProvider } from '../orchestrator/AgentOrchestrator.js';
import { MemoryManager } from '../core/MemoryManager.js';
import { SmartMemoryFilter } from '../core/SmartMemoryFilter.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';

class InteractiveChat {
  private orchestrator: AgentOrchestrator;
  private memoryManager: MemoryManager;
  private smartFilter: SmartMemoryFilter;
  private userId: string;
  private conversationId: string;
  private rl: readline.Interface;

  constructor(
    orchestrator: AgentOrchestrator,
    memoryManager: MemoryManager,
    smartFilter: SmartMemoryFilter,
    userId: string = 'default-user'
  ) {
    this.orchestrator = orchestrator;
    this.memoryManager = memoryManager;
    this.smartFilter = smartFilter;
    this.userId = userId;
    this.conversationId = `conv-${Date.now()}`;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Start the interactive chat
   */
  async start(): Promise<void> {
    console.log('\n🤖 Welcome to Supermemory Interactive Chat!\n');
    console.log('💡 I remember everything we discuss. Try asking me about our past conversations!\n');
    console.log('Commands:');
    console.log('  - Type your message to chat');
    console.log('  - /stats - Show memory statistics');
    console.log('  - /memories - Show recent memories');
    console.log('  - /graph - Show memory relationships');
    console.log('  - /clear - Clear all memories');
    console.log('  - /exit - Exit chat\n');
    console.log('─'.repeat(60) + '\n');

    await this.chatLoop();
  }

  /**
   * Main chat loop
   */
  private async chatLoop(): Promise<void> {
    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        this.rl.question(prompt, resolve);
      });
    };

    while (true) {
      const userInput = await question('You: ');
      
      if (!userInput.trim()) continue;

      // Handle commands
      if (userInput.startsWith('/')) {
        await this.handleCommand(userInput.trim());
        continue;
      }

      // Process message with AI
      console.log('\n🤔 Thinking...\n');

      try {
        const result = await this.orchestrator.processQuery(userInput, {
          conversationId: this.conversationId,
          memoryFilter: { userId: this.userId },
          storeResponse: false,  // We'll handle storage with smart filter
          memoryTopK: 10,
          systemPrompt: `You are a helpful AI assistant with perfect memory. 

IMPORTANT INSTRUCTIONS:
1. Use the RELEVANT MEMORIES section to understand the user's context and history
2. Give helpful, intelligent responses based on what you remember about the user
3. If memories are provided, reference them naturally in your response
4. Answer questions, provide help, give advice - be genuinely useful!
5. Don't just say "I'll remember this" - actually help the user with their request
6. Be conversational and friendly
7. If the user asks about past conversations, use the memories to answer accurately

Remember: You're not just a storage system - you're a helpful assistant that remembers everything!`
        });

        console.log(`🤖 AI: ${result.response}\n`);
        
        if (result.memoriesUsed > 0) {
          console.log(`💭 (Used ${result.memoriesUsed} memories from our past conversations)\n`);
        }

        // Use Smart Memory Filter to decide what to store
        console.log('🧠 Analyzing conversation for storage...');
        const decision = await this.smartFilter.analyzeConversation(userInput, result.response);
        
        if (decision.shouldStore) {
          // Store the conversation
          const supermemory = this.orchestrator.getSupermemory();
          const memory = await supermemory.rememberConversation(
            userInput,
            result.response,
            this.conversationId,
            {
              userId: this.userId,
              importance: decision.importance,
              category: decision.category as any
            }
          );
          
          console.log(`✅ Stored (${decision.category}, importance: ${(decision.importance * 100).toFixed(0)}%)`);
          console.log(`📝 ${decision.reasoning}`);
          if (decision.extractedFacts.length > 0) {
            console.log(`💡 Facts: ${decision.extractedFacts.join(', ')}\n`);
          }
        } else {
          console.log(`⏭️  Skipped storage: ${decision.reasoning}\n`);
        }

      } catch (error) {
        console.error('❌ Error:', error);
      }

      console.log('─'.repeat(60) + '\n');
    }
  }

  /**
   * Handle special commands
   */
  private async handleCommand(command: string): Promise<void> {
    const cmd = command.toLowerCase();

    if (cmd === '/exit' || cmd === '/quit') {
      console.log('\n👋 Saving memories and exiting...\n');
      await this.orchestrator.save();
      console.log('✅ Goodbye!\n');
      this.rl.close();
      process.exit(0);
    }

    if (cmd === '/stats') {
      const stats = this.orchestrator.getStats();
      console.log('\n📊 Memory Statistics:');
      console.log(`   Total Memories: ${stats.totalMemories}`);
      console.log(`   Vector Dimension: ${stats.dimension}`);
      console.log(`   Storage Path: ${stats.storagePath}\n`);
      return;
    }

    if (cmd === '/memories') {
      console.log('\n📚 Recent Memories:\n');
      const memories = await this.orchestrator.retrieveMemories(
        'recent conversations',
        10,
        { userId: this.userId }
      );

      memories.forEach((result, idx) => {
        const date = new Date(result.memory.timestamp).toLocaleString();
        console.log(`${idx + 1}. [${date}] ${result.memory.content.slice(0, 80)}...`);
      });
      console.log();
      return;
    }

    if (cmd === '/graph') {
      console.log('\n🕸️  Analyzing memory relationships...\n');
      const graph = await this.memoryManager.createMemoryGraph(this.userId);
      
      console.log(`Nodes (Memories): ${graph.nodes.length}`);
      console.log(`Edges (Relationships): ${graph.edges.length}\n`);
      
      if (graph.edges.length > 0) {
        console.log('Top Relationships:');
        graph.edges
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 5)
          .forEach((edge, idx) => {
            const node1 = graph.nodes.find(n => n.id === edge.from);
            const node2 = graph.nodes.find(n => n.id === edge.to);
            console.log(`${idx + 1}. "${node1?.content}" ↔ "${node2?.content}"`);
            console.log(`   Strength: ${(edge.strength * 100).toFixed(1)}%\n`);
          });
      }
      return;
    }

    if (cmd === '/clear') {
      const confirm = await new Promise<string>((resolve) => {
        this.rl.question('⚠️  Are you sure you want to clear all memories? (yes/no): ', resolve);
      });

      if (confirm.toLowerCase() === 'yes') {
        // Note: We don't have a clear method that filters by user, so this clears everything
        console.log('\n🗑️  Clearing memories...\n');
        console.log('⚠️  Note: This would clear all memories. Implement user-specific clearing if needed.\n');
      }
      return;
    }

    console.log(`\n❌ Unknown command: ${command}\n`);
  }
}

/**
 * Main function to start interactive chat
 */
async function main() {
  console.log('🚀 Initializing Supermemory Chat...\n');

  // Get user ID (you can customize this)
  const userId = process.argv[2] || 'default-user';
  console.log(`👤 User ID: ${userId}\n`);

  // Initialize Supermemory with user-specific storage
  const memory = new Supermemory({
    storagePath: './data',
    userId: userId  // Each user gets their own storage!
  });
  await memory.initialize();

  // Create orchestrator
  const orchestrator = new AgentOrchestrator(memory);
  
  // Set LLM provider - OpenRouter with FREE model!
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ERROR: OPENROUTER_API_KEY not found!\n');
    console.log('📝 To fix this:\n');
    console.log('1. Get FREE API key: https://openrouter.ai/keys');
    console.log('2. Set environment variable:\n');
    console.log('   Windows (PowerShell):');
    console.log('   $env:OPENROUTER_API_KEY="your-key-here"\n');
    console.log('   Mac/Linux:');
    console.log('   export OPENROUTER_API_KEY="your-key-here"\n');
    console.log('3. Run: npm run chat\n');
    process.exit(1);
  }

  // Use Qwen 2.5 72B model from OpenRouter (BEST quality for investor pitch!)
  const llmProvider = new OpenRouterProvider(
    apiKey,
    'qwen/qwen-2.5-72b-instruct'  // Premium model for production
  );
  
  orchestrator.setLLMProvider(llmProvider);

  // Create memory manager
  const memoryManager = new MemoryManager(memory);
  memoryManager.setLLMProvider(llmProvider);

  // Create smart memory filter
  const smartFilter = new SmartMemoryFilter(llmProvider);

  // Start interactive chat
  const chat = new InteractiveChat(orchestrator, memoryManager, smartFilter, userId);
  await chat.start();
}

// Always run when this file is executed
main().catch(console.error);

export { InteractiveChat };
