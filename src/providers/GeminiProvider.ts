/**
 * Google Gemini Provider - FREE API!
 * Get API key: https://makersuite.google.com/app/apikey
 */

import { LLMProvider } from '../orchestrator/AgentOrchestrator.js';

export class GeminiProvider implements LLMProvider {
  name = 'Google Gemini';
  private apiKey: string;
  private model: string;

  constructor(
    apiKey: string,
    model: string = 'gemini-pro'
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
}

/**
 * Example usage:
 * 
 * import { GeminiProvider } from './providers/GeminiProvider.js';
 * 
 * const provider = new GeminiProvider(process.env.GEMINI_API_KEY!);
 * orchestrator.setLLMProvider(provider);
 */
