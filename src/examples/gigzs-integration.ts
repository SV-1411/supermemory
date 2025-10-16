/**
 * Example: Gigzs Integration
 * Shows how to integrate Supermemory with a real application
 */

import { Supermemory } from '../core/Supermemory.js';
import { AgentOrchestrator, LLMProvider } from '../orchestrator/AgentOrchestrator.js';

/**
 * Mock LLM for demonstration
 */
class GigzsAIProvider implements LLMProvider {
  name = 'Gigzs AI Assistant';

  async generateResponse(prompt: string): Promise<string> {
    // In production, this would call your actual LLM
    // For now, we'll simulate intelligent responses based on memories
    
    if (prompt.includes('RELEVANT MEMORIES')) {
      const memoryCount = (prompt.match(/\[Memory \d+\]/g) || []).length;
      
      // Extract some context from the prompt
      if (prompt.toLowerCase().includes('budget') || prompt.toLowerCase().includes('price')) {
        return "Based on your previous preferences, I see you typically work with budgets in the $500-$1000 range for web development projects. I can show you gigs that match this criteria.";
      }
      
      if (prompt.toLowerCase().includes('skill') || prompt.toLowerCase().includes('expertise')) {
        return "I remember you have expertise in React, TypeScript, and Node.js. Would you like me to find gigs that match these skills?";
      }
      
      if (prompt.toLowerCase().includes('gig') || prompt.toLowerCase().includes('project')) {
        return `I found ${memoryCount} relevant memories about your past projects and preferences. Let me help you find the perfect gig!`;
      }
      
      return `I have ${memoryCount} relevant memories about your preferences and history. How can I help you today?`;
    }
    
    return "I'm here to help you find the perfect gig! Tell me what you're looking for.";
  }
}

/**
 * Gigzs Memory Manager
 * Wraps Supermemory with Gigzs-specific functionality
 */
class GigzsMemoryManager {
  private orchestrator: AgentOrchestrator;

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Store user profile information
   */
  async storeUserProfile(userId: string, profile: {
    skills?: string[];
    preferredCategories?: string[];
    budgetRange?: { min: number; max: number };
    experience?: string;
  }) {
    const memories = [];

    if (profile.skills && profile.skills.length > 0) {
      memories.push({
        content: `User has skills in: ${profile.skills.join(', ')}`,
        metadata: { userId, type: 'profile', category: 'skills' }
      });
    }

    if (profile.preferredCategories && profile.preferredCategories.length > 0) {
      memories.push({
        content: `User prefers gig categories: ${profile.preferredCategories.join(', ')}`,
        metadata: { userId, type: 'profile', category: 'preferences' }
      });
    }

    if (profile.budgetRange) {
      memories.push({
        content: `User typically works with budgets between $${profile.budgetRange.min} and $${profile.budgetRange.max}`,
        metadata: { userId, type: 'profile', category: 'budget' }
      });
    }

    if (profile.experience) {
      memories.push({
        content: `User experience level: ${profile.experience}`,
        metadata: { userId, type: 'profile', category: 'experience' }
      });
    }

    for (const memory of memories) {
      await this.orchestrator.storeMemory(memory.content, memory.metadata);
    }

    console.log(`✅ Stored ${memories.length} profile memories for user ${userId}`);
  }

  /**
   * Store gig interaction
   */
  async storeGigInteraction(userId: string, interaction: {
    gigId: string;
    gigTitle: string;
    action: 'viewed' | 'applied' | 'saved' | 'completed';
    category: string;
    budget?: number;
    feedback?: string;
  }) {
    let content = `User ${interaction.action} gig: "${interaction.gigTitle}" (${interaction.category})`;
    
    if (interaction.budget) {
      content += ` with budget $${interaction.budget}`;
    }
    
    if (interaction.feedback) {
      content += `. Feedback: ${interaction.feedback}`;
    }

    await this.orchestrator.storeMemory(content, {
      userId,
      type: 'interaction',
      gigId: interaction.gigId,
      action: interaction.action,
      category: interaction.category,
      timestamp: Date.now()
    });

    console.log(`✅ Stored gig interaction for user ${userId}`);
  }

  /**
   * Store conversation
   */
  async storeConversation(userId: string, userMessage: string, aiResponse: string) {
    await this.orchestrator.storeMemory(
      `User asked: "${userMessage}". AI responded: "${aiResponse}"`,
      {
        userId,
        type: 'conversation',
        timestamp: Date.now()
      }
    );
  }

  /**
   * Get personalized gig recommendations
   */
  async getGigRecommendations(userId: string, query: string) {
    return await this.orchestrator.processQuery(query, {
      useMemory: true,
      memoryTopK: 10,
      memoryFilter: { userId },
      storeResponse: false
    });
  }

  /**
   * Get user context for chat
   */
  async getChatContext(userId: string, message: string) {
    return await this.orchestrator.processQuery(message, {
      useMemory: true,
      memoryTopK: 5,
      memoryFilter: { userId },
      storeResponse: true,
      conversationId: `user-${userId}-chat`,
      systemPrompt: "You are Gigzs AI, a helpful assistant for freelancers. Use the user's history to provide personalized recommendations."
    });
  }
}

/**
 * Demo: Complete Gigzs workflow
 */
async function gigzsDemo() {
  console.log('🚀 Gigzs + Supermemory Integration Demo\n');
  console.log('='.repeat(70));

  // Initialize
  const memory = new Supermemory({
    storagePath: './data/gigzs-demo'
  });
  await memory.initialize();

  const orchestrator = new AgentOrchestrator(memory);
  orchestrator.setLLMProvider(new GigzsAIProvider());

  const gigzsMemory = new GigzsMemoryManager(orchestrator);

  // Simulate user onboarding
  console.log('\n👤 User Onboarding: Storing Profile...\n');
  
  await gigzsMemory.storeUserProfile('user_shivansh', {
    skills: ['React', 'TypeScript', 'Node.js', 'Python'],
    preferredCategories: ['Web Development', 'AI/ML', 'Mobile Apps'],
    budgetRange: { min: 500, max: 1500 },
    experience: 'Intermediate (2-5 years)'
  });

  // Simulate gig interactions
  console.log('\n💼 Storing Gig Interactions...\n');

  await gigzsMemory.storeGigInteraction('user_shivansh', {
    gigId: 'gig_001',
    gigTitle: 'Build a React Dashboard',
    action: 'applied',
    category: 'Web Development',
    budget: 800
  });

  await gigzsMemory.storeGigInteraction('user_shivansh', {
    gigId: 'gig_002',
    gigTitle: 'AI Chatbot Integration',
    action: 'saved',
    category: 'AI/ML',
    budget: 1200
  });

  await gigzsMemory.storeGigInteraction('user_shivansh', {
    gigId: 'gig_003',
    gigTitle: 'E-commerce Website',
    action: 'completed',
    category: 'Web Development',
    budget: 1500,
    feedback: 'Great project, client was very satisfied'
  });

  // Simulate chat interactions
  console.log('\n💬 Chat Interactions with Memory...\n');
  console.log('='.repeat(70));

  // Query 1: Budget preferences
  console.log('\n👤 User: "What\'s my typical budget range?"');
  const response1 = await gigzsMemory.getChatContext(
    'user_shivansh',
    "What's my typical budget range?"
  );
  console.log(`🤖 AI: ${response1.response}`);
  console.log(`   📊 Used ${response1.memoriesUsed} memories`);

  // Query 2: Skills
  console.log('\n👤 User: "What are my main skills?"');
  const response2 = await gigzsMemory.getChatContext(
    'user_shivansh',
    "What are my main skills?"
  );
  console.log(`🤖 AI: ${response2.response}`);
  console.log(`   📊 Used ${response2.memoriesUsed} memories`);

  // Query 3: Past projects
  console.log('\n👤 User: "Show me gigs similar to what I\'ve done before"');
  const response3 = await gigzsMemory.getChatContext(
    'user_shivansh',
    "Show me gigs similar to what I've done before"
  );
  console.log(`🤖 AI: ${response3.response}`);
  console.log(`   📊 Used ${response3.memoriesUsed} memories`);

  // Show all memories
  console.log('\n\n='.repeat(70));
  console.log('\n📚 All Stored Memories:\n');

  const allMemories = memory.exportMemories();
  allMemories.forEach((mem, idx) => {
    console.log(`${idx + 1}. [${mem.metadata.type}] ${mem.content.slice(0, 80)}...`);
  });

  // Statistics
  console.log('\n\n='.repeat(70));
  console.log('\n📊 Statistics:\n');
  const stats = orchestrator.getStats();
  console.log(`   Total Memories: ${stats.totalMemories}`);
  console.log(`   Storage Path: ${stats.storagePath}`);

  // Save
  await orchestrator.save();
  console.log('\n💾 All memories saved to disk!');
  console.log('\n✅ Demo complete!\n');
}

// Run the demo
gigzsDemo().catch(console.error);
