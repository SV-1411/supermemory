/**
 * OpenRouter Provider - Access to FREE AI models!
 * Get API key: https://openrouter.ai/keys
 * 
 * FREE Models Available:
 * - meta-llama/llama-3.2-3b-instruct:free
 * - google/gemma-2-9b-it:free
 * - mistralai/mistral-7b-instruct:free
 * - nousresearch/hermes-3-llama-3.1-405b:free
 */

import { LLMProvider } from '../orchestrator/AgentOrchestrator.js';

export class OpenRouterProvider implements LLMProvider {
  name = 'OpenRouter';
  private apiKey: string;
  private model: string;

  constructor(
    apiKey: string,
    model: string = 'meta-llama/llama-3.2-3b-instruct:free' // FREE model!
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/supermemory-ai',
          'X-Title': 'Supermemory AI'
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
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      throw error;
    }
  }
}

/**
 * FREE Models on OpenRouter:
 * 
 * 1. meta-llama/llama-3.2-3b-instruct:free (RECOMMENDED)
 *    - Fast, good quality
 *    - Great for general tasks
 * 
 * 2. google/gemma-2-9b-it:free
 *    - Very good quality
 *    - Slightly slower
 * 
 * 3. mistralai/mistral-7b-instruct:free
 *    - Excellent for coding
 * 
 * 4. nousresearch/hermes-3-llama-3.1-405b:free
 *    - BEST quality (huge model!)
 *    - Slower but very smart
 * 
 * Usage:
 * const provider = new OpenRouterProvider(
 *   process.env.OPENROUTER_API_KEY!,
 *   'meta-llama/llama-3.2-3b-instruct:free'
 * );
 */
