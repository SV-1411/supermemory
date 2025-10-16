/**
 * Agent Orchestrator - LLM-agnostic interface
 * Works with any LLM (OpenAI, Claude, local models, etc.)
 */

import { Supermemory } from '../core/Supermemory.js';
import { MemoryMetadata } from '../types/index.js';

export interface LLMProvider {
  name: string;
  generateResponse(prompt: string): Promise<string>;
}

export interface OrchestrationOptions {
  useMemory?: boolean;
  memoryTopK?: number;
  memoryFilter?: Partial<MemoryMetadata>;
  storeResponse?: boolean;
  conversationId?: string;
  systemPrompt?: string;
}

export class AgentOrchestrator {
  private supermemory: Supermemory;
  private llmProvider: LLMProvider | null = null;

  constructor(supermemory: Supermemory) {
    this.supermemory = supermemory;
  }

  /**
   * Set the LLM provider (OpenAI, Claude, local model, etc.)
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
    console.log(`🤖 LLM Provider set: ${provider.name}`);
  }

  /**
   * Process a user query with memory-augmented context
   */
  async processQuery(
    userQuery: string,
    options: OrchestrationOptions = {}
  ): Promise<{
    response: string;
    memoriesUsed: number;
    memoryIds?: { userMemoryId: string; assistantMemoryId: string };
  }> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not set. Call setLLMProvider() first.');
    }

    const {
      useMemory = true,
      memoryTopK = 5,
      memoryFilter,
      storeResponse = true,
      conversationId = 'default',
      systemPrompt
    } = options;

    let prompt = userQuery;
    let memoriesUsed = 0;

    // Retrieve relevant memories if enabled
    if (useMemory) {
      const context = await this.supermemory.buildLLMContext(userQuery, {
        topK: memoryTopK,
        filter: memoryFilter,
        systemPrompt
      });

      memoriesUsed = context.memories.length;
      prompt = this.supermemory.formatContextForPrompt(context);

      console.log(`🧠 Retrieved ${memoriesUsed} relevant memories`);
    }

    // Generate response from LLM
    console.log(`💭 Generating response with ${this.llmProvider.name}...`);
    const response = await this.llmProvider.generateResponse(prompt);

    // Store conversation in memory if enabled
    let memoryIds;
    if (storeResponse) {
      memoryIds = await this.supermemory.rememberConversation(
        userQuery,
        response,
        conversationId
      );
      console.log(`💾 Conversation stored in memory`);
    }

    return {
      response,
      memoriesUsed,
      memoryIds
    };
  }

  /**
   * Process a query without LLM (just memory retrieval)
   */
  async retrieveMemories(
    query: string,
    topK: number = 5,
    filter?: Partial<MemoryMetadata>
  ) {
    return await this.supermemory.recall({
      query,
      topK,
      filter
    });
  }

  /**
   * Manually store information in memory
   */
  async storeMemory(
    content: string,
    metadata?: MemoryMetadata
  ): Promise<string> {
    return await this.supermemory.remember(content, metadata);
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return this.supermemory.getStats();
  }

  /**
   * Save memories to disk
   */
  async save(): Promise<void> {
    await this.supermemory.save();
  }

  /**
   * Get direct access to Supermemory (for advanced operations)
   */
  getSupermemory(): Supermemory {
    return this.supermemory;
  }
}
