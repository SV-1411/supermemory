/**
 * Ollama LLM Provider - 100% FREE Local LLM
 * Install Ollama: https://ollama.ai
 * Run: ollama pull llama2 (or any other model)
 * Start: ollama serve
 */

import { LLMProvider } from '../orchestrator/AgentOrchestrator.js';

export class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  private model: string;
  private baseURL: string;

  constructor(
    model: string = 'llama2',
    baseURL: string = 'http://localhost:11434'
  ) {
    this.model = model;
    this.baseURL = baseURL;
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 500
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${error}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama API Error:', error);
      console.error('Make sure Ollama is running: ollama serve');
      throw error;
    }
  }
}

/**
 * Example usage:
 * 
 * import { OllamaProvider } from './providers/OllamaProvider.js';
 * 
 * // Make sure Ollama is running!
 * // Terminal 1: ollama serve
 * // Terminal 2: ollama pull llama2
 * 
 * const provider = new OllamaProvider('llama2');
 * orchestrator.setLLMProvider(provider);
 */
