/**
 * Core types for Supermemory system
 */

export interface Memory {
  id: string;
  content: string;
  embedding: number[];
  metadata: MemoryMetadata;
  timestamp: number;
}

export interface MemoryMetadata {
  userId?: string;
  conversationId?: string;
  messageType?: 'user' | 'assistant' | 'system';
  tags?: string[];
  importance?: number; // 0-1 scale for future TTL/compression
  source?: string;
  [key: string]: any; // Allow custom metadata
}

export interface MemoryQuery {
  query: string;
  topK?: number;
  filter?: Partial<MemoryMetadata>;
  threshold?: number; // Minimum similarity score
}

export interface MemoryResult {
  memory: Memory;
  similarity: number;
}

export interface SupermemoryConfig {
  embeddingModel?: string;
  vectorDimension?: number;
  storagePath?: string;
  maxMemories?: number;
  userId?: string;  // Add userId for multi-user support
}

export interface LLMContext {
  systemPrompt?: string;
  memories: MemoryResult[];
  currentQuery: string;
}
