/**
 * Interactive Chat with RAG - Production Version
 * Uses Pinecone or local storage with proper persistence
 */

import * as readline from 'readline';
import { PineconeRAG } from '../rag/PineconeRAG.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { SmartMemoryFilter } from '../core/SmartMemoryFilter.js';
import { Supermemory } from '../core/Supermemory.js';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator.js';

class InteractiveChatRAG {
  private rag: PineconeRAG | null = null;
  private fallbackMemory: Supermemory | null = null;
  private orchestrator: AgentOrchestrator | null = null;
  private llmProvider: OpenRouterProvider;
  private smartFilter: SmartMemoryFilter;
  private userId: string;
  private conversationId: string;
  private rl: readline.Interface;
  private usePinecone: boolean = false;
  private conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = [];

  constructor(
    llmProvider: OpenRouterProvider,
    smartFilter: SmartMemoryFilter,
    userId: string = 'default-user'
  ) {
    this.llmProvider = llmProvider;
    this.smartFilter = smartFilter;
    this.userId = userId;
    this.conversationId = `conv-${Date.now()}`;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing RAG system...\n');

    // Try to use Pinecone if API key is available
    const pineconeKey = process.env.PINECONE_API_KEY;
    
    if (pineconeKey) {
      try {
        console.log('📦 Connecting to Pinecone...');
        this.rag = new PineconeRAG({
          apiKey: pineconeKey,
          indexName: 'supermemory',
          dimension: 384
        });
        await this.rag.initialize();
        this.usePinecone = true;
        console.log('✅ Pinecone RAG initialized!\n');
      } catch (error) {
        console.log('⚠️  Pinecone initialization failed, falling back to local storage');
        console.log(`   Error: ${error}\n`);
        this.usePinecone = false;
      }
    } else {
      console.log('ℹ️  No PINECONE_API_KEY found, using local storage\n');
    }

    // Fallback to local storage
    if (!this.usePinecone) {
      this.fallbackMemory = new Supermemory({
        storagePath: './data',
        userId: this.userId
      });
      await this.fallbackMemory.initialize();
      
      this.orchestrator = new AgentOrchestrator(this.fallbackMemory);
      this.orchestrator.setLLMProvider(this.llmProvider);
      console.log('✅ Local storage initialized!\n');
    }
  }

  async start(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║        🧠 SUPERMEMORY - AI WITH PERFECT MEMORY        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`Storage: ${this.usePinecone ? '☁️  Pinecone (Cloud)' : '💾 Local'}`);
    console.log(`User: ${this.userId}`);
    console.log(`Model: Qwen 2.5 72B\n`);
    console.log('Commands: /help, /stats, /memories, /exit\n');
    console.log('─'.repeat(60) + '\n');

    while (true) {
      const userInput = await this.prompt('You: ');

      if (!userInput.trim()) continue;

      // Handle commands
      if (userInput.startsWith('/')) {
        await this.handleCommand(userInput);
        continue;
      }

      // Process message with AI
      console.log('\n🤔 Thinking...\n');

      try {
        let response: string;
        let memoriesUsed = 0;

        if (this.usePinecone && this.rag) {
          // Build context with conversation history
          let contextPrompt = `You are a helpful AI assistant with perfect memory.

IMPORTANT INSTRUCTIONS:
1. Use the RELEVANT MEMORIES section to understand the user's context and history
2. Use the CURRENT CONVERSATION section to maintain context within this session
3. Give helpful, intelligent responses based on what you remember about the user
4. If memories are provided, reference them naturally in your response
5. Answer questions, provide help, give advice - be genuinely useful!
6. Don't just say "I'll remember this" - actually help the user with their request
7. Be conversational and friendly
8. If the user asks about past conversations, use the memories to answer accurately

Remember: You're not just a storage system - you're a helpful assistant that remembers everything!`;

          // Add current conversation history
          if (this.conversationHistory.length > 0) {
            contextPrompt += '\n\n=== CURRENT CONVERSATION ===\n\n';
            this.conversationHistory.slice(-10).forEach(msg => {
              contextPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
            contextPrompt += '\n';
          }

          // Use Pinecone RAG with lower threshold for better recall
          const result = await this.rag.retrieveAndGenerate(
            userInput,
            this.llmProvider,
            {
              topK: 10,
              filter: { userId: this.userId },
              threshold: 0.3,  // Lower threshold for better recall
              systemPrompt: contextPrompt
            }
          );

          response = result.response;
          memoriesUsed = result.memories.length;
          
          // Add to conversation history
          this.conversationHistory.push({ role: 'user', content: userInput });
          this.conversationHistory.push({ role: 'assistant', content: response });
        } else if (this.orchestrator) {
          // Build context with conversation history
          let contextPrompt = `You are a helpful AI assistant with perfect memory.

IMPORTANT INSTRUCTIONS:
1. Use the RELEVANT MEMORIES section to understand the user's context and history
2. Use the CURRENT CONVERSATION section to maintain context within this session
3. Give helpful, intelligent responses based on what you remember about the user
4. If memories are provided, reference them naturally in your response
5. Answer questions, provide help, give advice - be genuinely useful!
6. Don't just say "I'll remember this" - actually help the user with their request
7. Be conversational and friendly
8. If the user asks about past conversations, use the memories to answer accurately

Remember: You're not just a storage system - you're a helpful assistant that remembers everything!`;

          // Add current conversation history
          if (this.conversationHistory.length > 0) {
            contextPrompt += '\n\n=== CURRENT CONVERSATION ===\n\n';
            this.conversationHistory.slice(-10).forEach(msg => {
              contextPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
            contextPrompt += '\n';
          }

          // Use local storage
          const result = await this.orchestrator.processQuery(userInput, {
            conversationId: this.conversationId,
            memoryFilter: { userId: this.userId },
            storeResponse: false,
            memoryTopK: 5,
            systemPrompt: contextPrompt
          });

          response = result.response;
          memoriesUsed = result.memoriesUsed;
          
          // Add to conversation history
          this.conversationHistory.push({ role: 'user', content: userInput });
          this.conversationHistory.push({ role: 'assistant', content: response });
        } else {
          throw new Error('No storage system available');
        }

        console.log(`🤖 AI: ${response}\n`);
        
        if (memoriesUsed > 0) {
          console.log(`💭 (Used ${memoriesUsed} memories from our past conversations)\n`);
        }

        // Use Smart Memory Filter to decide what to store
        console.log('🧠 Analyzing conversation for storage...');
        const decision = await this.smartFilter.analyzeConversation(userInput, response);
        
        if (decision.shouldStore) {
          // Store the conversation
          if (this.usePinecone && this.rag) {
            await this.rag.create(userInput, {
              userId: this.userId,
              conversationId: this.conversationId,
              importance: decision.importance,
              category: decision.category as any
            });
            await this.rag.create(response, {
              userId: this.userId,
              conversationId: this.conversationId,
              messageType: 'assistant',
              importance: decision.importance,
              category: decision.category as any
            });
          } else if (this.fallbackMemory) {
            await this.fallbackMemory.rememberConversation(
              userInput,
              response,
              this.conversationId,
              {
                userId: this.userId,
                importance: decision.importance
              }
            );
          }
          
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

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  private async handleCommand(command: string): Promise<void> {
    const cmd = command.toLowerCase().trim();

    if (cmd === '/exit' || cmd === '/quit') {
      console.log('\n💾 Saving memories...');
      
      if (this.fallbackMemory) {
        await this.fallbackMemory.save();
      }
      
      console.log('✅ Saved! Goodbye! 👋\n');
      this.rl.close();
      process.exit(0);
    }

    if (cmd === '/help') {
      console.log('\n📚 Available Commands:\n');
      console.log('  /help      - Show this help message');
      console.log('  /stats     - Show memory statistics');
      console.log('  /memories  - View recent memories');
      console.log('  /exit      - Save and exit\n');
      return;
    }

    if (cmd === '/stats') {
      console.log('\n📊 Memory Statistics:\n');
      
      if (this.usePinecone && this.rag) {
        const stats = await this.rag.getStats();
        console.log(`   Storage: ☁️  Pinecone (Cloud)`);
        console.log(`   Total Vectors: ${stats.totalVectors}`);
        console.log(`   Dimension: ${stats.dimension}`);
        console.log(`   Index: ${stats.indexName}`);
      } else if (this.fallbackMemory) {
        const stats = this.fallbackMemory.getStats();
        console.log(`   Storage: 💾 Local`);
        console.log(`   Total Memories: ${stats.totalMemories}`);
        console.log(`   Vector Dimension: ${stats.vectorDimension}`);
        console.log(`   Storage Path: ${stats.storagePath}`);
      }
      console.log();
      return;
    }

    if (cmd === '/memories') {
      console.log('\n📝 Recent Memories:\n');
      
      try {
        if (this.usePinecone && this.rag) {
          const results = await this.rag.retrieve('', {
            topK: 5,
            filter: { userId: this.userId },
            threshold: 0
          });
          
          if (results.length === 0) {
            console.log('   No memories found yet. Start chatting!\n');
          } else {
            results.forEach((result, idx) => {
              const date = new Date(result.memory.timestamp).toLocaleString();
              console.log(`   [${idx + 1}] ${date}`);
              console.log(`       ${result.memory.content.slice(0, 100)}...`);
              console.log();
            });
          }
        } else if (this.fallbackMemory) {
          const results = await this.fallbackMemory.recall({
            query: '',
            topK: 5,
            filter: { userId: this.userId },
            threshold: 0
          });
          
          if (results.length === 0) {
            console.log('   No memories found yet. Start chatting!\n');
          } else {
            results.forEach((result, idx) => {
              const date = new Date(result.memory.timestamp).toLocaleString();
              console.log(`   [${idx + 1}] ${date}`);
              console.log(`       ${result.memory.content.slice(0, 100)}...`);
              console.log();
            });
          }
        }
      } catch (error) {
        console.log('   Error retrieving memories:', error);
      }
      return;
    }

    console.log(`\n❌ Unknown command: ${command}\n`);
  }
}

/**
 * Main function to start interactive chat with RAG
 */
async function main() {
  console.log('🚀 Initializing Supermemory Chat with RAG...\n');

  // Check for OpenRouter API key
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openrouterKey) {
    console.error('❌ ERROR: OPENROUTER_API_KEY not found!\n');
    console.log('📝 To fix this:\n');
    console.log('1. Get API key: https://openrouter.ai/keys');
    console.log('2. Set environment variable:\n');
    console.log('   Windows (PowerShell):');
    console.log('   $env:OPENROUTER_API_KEY="your-key-here"\n');
    console.log('   Mac/Linux:');
    console.log('   export OPENROUTER_API_KEY="your-key-here"\n');
    console.log('3. Run: npm run chat:rag\n');
    process.exit(1);
  }

  // Get user ID
  const userId = process.argv[2] || 'default-user';
  console.log(`👤 User ID: ${userId}\n`);

  // Initialize LLM provider
  const llmProvider = new OpenRouterProvider(
    openrouterKey,
    'qwen/qwen-2.5-72b-instruct'
  );

  // Initialize smart filter
  const smartFilter = new SmartMemoryFilter(llmProvider);

  // Create and start chat
  const chat = new InteractiveChatRAG(llmProvider, smartFilter, userId);
  await chat.initialize();
  await chat.start();
}

// Run
main().catch(console.error);

export { InteractiveChatRAG };
