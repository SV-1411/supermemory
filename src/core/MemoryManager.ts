/**
 * Memory Manager - Intelligent memory storage with deduplication
 * Handles memory merging, deduplication, and relationship detection
 */

import { Supermemory } from './Supermemory.js';
import { Memory, MemoryMetadata } from '../types/index.js';
import { LLMProvider } from '../orchestrator/AgentOrchestrator.js';

export interface MemoryRelationship {
  memoryId1: string;
  memoryId2: string;
  relationshipType: 'duplicate' | 'update' | 'related' | 'continuation';
  similarity: number;
  reasoning: string;
}

export class MemoryManager {
  private supermemory: Supermemory;
  private llmProvider: LLMProvider | null = null;
  private deduplicationThreshold: number = 0.85; // High similarity = likely duplicate

  constructor(supermemory: Supermemory) {
    this.supermemory = supermemory;
  }

  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Intelligently store a memory with deduplication and relationship detection
   */
  async storeIntelligently(
    content: string,
    metadata: MemoryMetadata = {}
  ): Promise<{
    stored: boolean;
    memoryId?: string;
    action: 'stored' | 'merged' | 'updated' | 'skipped';
    relatedMemories?: Memory[];
    reasoning?: string;
  }> {
    // 1. Check if this memory already exists or is similar
    const similarMemories = await this.supermemory.recall({
      query: content,
      topK: 5,
      filter: metadata.userId ? { userId: metadata.userId } : undefined,
      threshold: 0.7
    });

    // 2. If very similar memory exists, decide what to do
    if (similarMemories.length > 0 && similarMemories[0].similarity > this.deduplicationThreshold) {
      const existingMemory = similarMemories[0].memory;
      
      // Check if it's a duplicate or an update
      const relationship = await this.detectRelationship(content, existingMemory.content);
      
      if (relationship === 'duplicate') {
        return {
          stored: false,
          action: 'skipped',
          relatedMemories: [existingMemory],
          reasoning: 'This information is already stored'
        };
      } else if (relationship === 'update') {
        // Store as new memory but mark relationship
        const memoryId = await this.supermemory.remember(content, {
          ...metadata,
          relatedTo: existingMemory.id,
          relationshipType: 'update'
        });
        
        return {
          stored: true,
          memoryId,
          action: 'updated',
          relatedMemories: [existingMemory],
          reasoning: 'Stored as an update to existing memory'
        };
      }
    }

    // 3. Store as new memory
    const memoryId = await this.supermemory.remember(content, metadata);
    
    return {
      stored: true,
      memoryId,
      action: 'stored',
      relatedMemories: similarMemories.length > 0 ? similarMemories.map(r => r.memory) : undefined,
      reasoning: 'Stored as new memory'
    };
  }

  /**
   * Detect relationship between two pieces of text
   */
  private async detectRelationship(
    newContent: string,
    existingContent: string
  ): Promise<'duplicate' | 'update' | 'related' | 'different'> {
    // Simple heuristic-based detection (can be enhanced with LLM)
    
    // Exact match or very similar
    if (newContent.toLowerCase() === existingContent.toLowerCase()) {
      return 'duplicate';
    }

    // Check if it's an update (contains time-related words)
    const updateKeywords = ['now', 'today', 'currently', 'update', 'changed', 'became'];
    const hasUpdateKeywords = updateKeywords.some(keyword => 
      newContent.toLowerCase().includes(keyword)
    );

    if (hasUpdateKeywords) {
      return 'update';
    }

    // Check if it's related (similar topic but different info)
    const newWords = new Set(newContent.toLowerCase().split(/\s+/));
    const existingWords = new Set(existingContent.toLowerCase().split(/\s+/));
    const intersection = new Set([...newWords].filter(x => existingWords.has(x)));
    const overlap = intersection.size / Math.min(newWords.size, existingWords.size);

    if (overlap > 0.5) {
      return 'related';
    }

    return 'different';
  }

  /**
   * Ask LLM if a conversation should be stored
   */
  async shouldStoreConversation(
    userMessage: string,
    assistantResponse: string,
    conversationContext?: string
  ): Promise<{
    shouldStore: boolean;
    reasoning: string;
    extractedInfo?: string[];
  }> {
    if (!this.llmProvider) {
      // Default: store everything if no LLM
      return {
        shouldStore: true,
        reasoning: 'No LLM configured, storing by default'
      };
    }

    // Ask LLM to analyze the conversation
    const prompt = `Analyze this conversation and determine if it contains information worth remembering long-term.

User: "${userMessage}"
Assistant: "${assistantResponse}"

Consider:
1. Does it contain personal information, preferences, or facts about the user?
2. Is it just casual chat or does it have lasting value?
3. What specific information should be extracted and remembered?

Respond in JSON format:
{
  "shouldStore": true/false,
  "reasoning": "why or why not",
  "extractedInfo": ["fact 1", "fact 2", ...]
}`;

    try {
      const response = await this.llmProvider.generateResponse(prompt);
      const analysis = JSON.parse(response);
      return analysis;
    } catch (error) {
      // Fallback: store everything
      return {
        shouldStore: true,
        reasoning: 'Error analyzing, storing by default',
        extractedInfo: [userMessage]
      };
    }
  }

  /**
   * Find and merge duplicate or related memories
   */
  async findDuplicates(userId?: string): Promise<MemoryRelationship[]> {
    const allMemories = this.supermemory.exportMemories();
    const userMemories = userId 
      ? allMemories.filter(m => m.metadata.userId === userId)
      : allMemories;

    const relationships: MemoryRelationship[] = [];

    // Compare each memory with others
    for (let i = 0; i < userMemories.length; i++) {
      for (let j = i + 1; j < userMemories.length; j++) {
        const mem1 = userMemories[i];
        const mem2 = userMemories[j];

        // Calculate similarity
        const results = await this.supermemory.recall({
          query: mem1.content,
          topK: 1,
          filter: { userId }
        });

        if (results.length > 0 && results[0].memory.id === mem2.id) {
          const similarity = results[0].similarity;

          if (similarity > this.deduplicationThreshold) {
            const relationshipType = await this.detectRelationship(
              mem1.content,
              mem2.content
            );

            relationships.push({
              memoryId1: mem1.id,
              memoryId2: mem2.id,
              relationshipType: relationshipType as any,
              similarity,
              reasoning: `${Math.round(similarity * 100)}% similar`
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Create a memory graph showing relationships
   */
  async createMemoryGraph(userId: string): Promise<{
    nodes: Array<{ id: string; content: string; timestamp: number }>;
    edges: Array<{ from: string; to: string; type: string; strength: number }>;
  }> {
    const memories = this.supermemory.exportMemories()
      .filter(m => m.metadata.userId === userId);

    const nodes = memories.map(m => ({
      id: m.id,
      content: m.content.slice(0, 50) + '...',
      timestamp: m.timestamp
    }));

    const edges: Array<{ from: string; to: string; type: string; strength: number }> = [];

    // Find relationships between memories
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const mem1 = memories[i];
        const mem2 = memories[j];

        // Check if they're related
        const results = await this.supermemory.recall({
          query: mem1.content,
          topK: 5
        });

        const relatedResult = results.find(r => r.memory.id === mem2.id);
        if (relatedResult && relatedResult.similarity > 0.7) {
          edges.push({
            from: mem1.id,
            to: mem2.id,
            type: 'related',
            strength: relatedResult.similarity
          });
        }
      }
    }

    return { nodes, edges };
  }
}
