/**
 * Smart Memory Filter - AI decides what to store
 * Production-grade memory management for investor pitch
 */

import { LLMProvider } from '../orchestrator/AgentOrchestrator.js';
import { MemoryMetadata } from '../types/index.js';

export interface MemoryDecision {
  shouldStore: boolean;
  reasoning: string;
  importance: number;  // 0-1 scale
  extractedFacts: string[];
  category: 'personal' | 'preference' | 'project' | 'question' | 'casual' | 'important';
}

export class SmartMemoryFilter {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Ask AI if this conversation should be stored
   */
  async analyzeConversation(
    userMessage: string,
    aiResponse: string,
    context?: string
  ): Promise<MemoryDecision> {
    const prompt = `You are a memory management system. Analyze this conversation and decide if it should be stored in long-term memory.

CONVERSATION:
User: "${userMessage}"
AI: "${aiResponse}"

${context ? `CONTEXT: ${context}` : ''}

ANALYSIS CRITERIA:
1. Personal Information (name, age, location, etc.) - STORE
2. Preferences (likes, dislikes, habits) - STORE
3. Projects/Work (what user is building/doing) - STORE
4. Important Questions & Answers - STORE
5. Casual Greetings (hi, hello, bye) - DON'T STORE
6. Redundant Information (already stored) - DON'T STORE
7. Temporary/Transient Info - DON'T STORE

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "shouldStore": true or false,
  "reasoning": "brief explanation",
  "importance": 0.0 to 1.0,
  "extractedFacts": ["fact 1", "fact 2"],
  "category": "personal" | "preference" | "project" | "question" | "casual" | "important"
}`;

    try {
      const response = await this.llmProvider.generateResponse(prompt);
      
      // Clean response (remove markdown code blocks if present)
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const decision = JSON.parse(cleanedResponse) as MemoryDecision;
      
      // Validate decision
      if (typeof decision.shouldStore !== 'boolean') {
        throw new Error('Invalid decision format');
      }
      
      return decision;
    } catch (error) {
      console.error('❌ Error analyzing conversation:', error);
      
      // Fallback: Use heuristics
      return this.heuristicAnalysis(userMessage, aiResponse);
    }
  }

  /**
   * Fallback heuristic analysis if AI fails
   */
  private heuristicAnalysis(userMessage: string, aiResponse: string): MemoryDecision {
    const lowerMessage = userMessage.toLowerCase();
    
    // Casual greetings - don't store
    const greetings = ['hi', 'hello', 'hey', 'bye', 'goodbye', 'thanks', 'thank you'];
    if (greetings.some(g => lowerMessage === g || lowerMessage === g + '!')) {
      return {
        shouldStore: false,
        reasoning: 'Casual greeting',
        importance: 0.1,
        extractedFacts: [],
        category: 'casual'
      };
    }

    // Personal info keywords
    const personalKeywords = ['my name is', 'i am', "i'm", 'i live', 'i work'];
    if (personalKeywords.some(k => lowerMessage.includes(k))) {
      return {
        shouldStore: true,
        reasoning: 'Contains personal information',
        importance: 0.9,
        extractedFacts: [userMessage],
        category: 'personal'
      };
    }

    // Preference keywords
    const preferenceKeywords = ['i like', 'i love', 'i prefer', 'i hate', 'i dislike', 'favorite'];
    if (preferenceKeywords.some(k => lowerMessage.includes(k))) {
      return {
        shouldStore: true,
        reasoning: 'Contains user preference',
        importance: 0.8,
        extractedFacts: [userMessage],
        category: 'preference'
      };
    }

    // Project keywords
    const projectKeywords = ['building', 'working on', 'project', 'developing', 'creating'];
    if (projectKeywords.some(k => lowerMessage.includes(k))) {
      return {
        shouldStore: true,
        reasoning: 'Contains project information',
        importance: 0.9,
        extractedFacts: [userMessage],
        category: 'project'
      };
    }

    // Questions - store if substantial
    if (lowerMessage.includes('?') && userMessage.split(' ').length > 3) {
      return {
        shouldStore: true,
        reasoning: 'Important question and answer',
        importance: 0.7,
        extractedFacts: [userMessage, aiResponse],
        category: 'question'
      };
    }

    // Default: store if message is substantial (>5 words)
    if (userMessage.split(' ').length > 5) {
      return {
        shouldStore: true,
        reasoning: 'Substantial conversation',
        importance: 0.6,
        extractedFacts: [userMessage],
        category: 'important'
      };
    }

    // Default: don't store short, casual messages
    return {
      shouldStore: false,
      reasoning: 'Too short or casual',
      importance: 0.2,
      extractedFacts: [],
      category: 'casual'
    };
  }

  /**
   * Batch analyze multiple conversations
   */
  async analyzeMultiple(
    conversations: Array<{ user: string; ai: string }>
  ): Promise<MemoryDecision[]> {
    const decisions: MemoryDecision[] = [];
    
    for (const conv of conversations) {
      const decision = await this.analyzeConversation(conv.user, conv.ai);
      decisions.push(decision);
    }
    
    return decisions;
  }

  /**
   * Get storage statistics
   */
  getStats(decisions: MemoryDecision[]): {
    total: number;
    stored: number;
    skipped: number;
    byCategory: Record<string, number>;
    avgImportance: number;
  } {
    const stored = decisions.filter(d => d.shouldStore).length;
    const skipped = decisions.length - stored;
    
    const byCategory: Record<string, number> = {};
    let totalImportance = 0;
    
    for (const decision of decisions) {
      byCategory[decision.category] = (byCategory[decision.category] || 0) + 1;
      if (decision.shouldStore) {
        totalImportance += decision.importance;
      }
    }
    
    return {
      total: decisions.length,
      stored,
      skipped,
      byCategory,
      avgImportance: stored > 0 ? totalImportance / stored : 0
    };
  }
}
