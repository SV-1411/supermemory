/**
 * OpenAI LLM Provider
 * Install: npm install openai
 * Usage: Set OPENAI_API_KEY environment variable
 */

import { LLMProvider } from '../orchestrator/AgentOrchestrator.js';

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI GPT';
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(
    apiKey: string,
    model: string = 'gpt-3.5-turbo',
    baseURL: string = 'https://api.openai.com/v1'
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL;
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
}

/**
 * Example usage:
 * 
 * import { OpenAIProvider } from './providers/OpenAIProvider.js';
 * 
 * const provider = new OpenAIProvider(
 *   process.env.OPENAI_API_KEY!,
 *   'gpt-3.5-turbo' // or 'gpt-4'
 * );
 * 
 * orchestrator.setLLMProvider(provider);
 */
