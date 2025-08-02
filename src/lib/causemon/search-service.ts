import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { PublicFigure, Topic, Monitor } from '@prisma/client';
import { getGeminiLogger } from './gemini-logger';

// Response validation schema
const SearchResultSchema = z.object({
  events: z.array(z.object({
    title: z.string(),
    eventDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format"
    }),
    summary: z.string(),
    quotes: z.array(z.string()),
    sources: z.array(z.object({
      url: z.string().url(),
      publisher: z.string(),
      headline: z.string()
    }))
  }))
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

interface MonitorWithRelations extends Monitor {
  publicFigure: PublicFigure;
  topic: Topic;
}

export class GeminiSearchService {
  private genAI: GoogleGenAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async searchForEvents(monitor: MonitorWithRelations): Promise<SearchResult> {
    const logger = getGeminiLogger();
    const prompt = this.buildSearchPrompt(monitor);
    
    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const startTime = Date.now();
        
        // Log the request
        logger.logRequest(prompt, {
          model: 'gemini-2.5-pro',
          monitor: `${monitor.publicFigure.name} on ${monitor.topic.name}`,
          attempt: attempt + 1
        });
        
        const result = await this.genAI.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            tools: [{
              googleSearch: {}
            }],
            temperature: 0.0
          }
        });
        const text = result.text || '';
        
        const duration = Date.now() - startTime;
        
        // Log the raw response
        logger.logResponse({ text, response: result }, duration);
        
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        const jsonData = JSON.parse(jsonMatch[0]);
        
        // Validate with schema
        const validated = SearchResultSchema.parse(jsonData);
        
        // Log success for monitoring
        console.log(`Search successful for ${monitor.publicFigure.name} on ${monitor.topic.name}: ${validated.events.length} events found`);
        
        return validated;
      } catch (error) {
        lastError = error as Error;
        logger.logError(error, prompt);
        console.error(`Search attempt ${attempt + 1} failed:`, error);
        
        // Exponential backoff
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw new Error(`Search failed after 3 attempts: ${lastError?.message}`);
  }

  private buildSearchPrompt(monitor: MonitorWithRelations): string {
    const { publicFigure, topic } = monitor;
    
    // Build date filter - always search last 2 days to catch everything
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const dateFilter = `from ${twoDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`;
    
    // Include aliases and keywords for better search coverage
    const figureNames = [publicFigure.name, ...(publicFigure.aliases || [])].join(' OR ');
    const topicKeywords = [topic.name, ...(topic.keywords || [])].join(' OR ');
    
    return `
Search for recent news and statements ${dateFilter} where ${publicFigure.name} 
(also known as: ${publicFigure.aliases?.join(', ') || 'no aliases'}) 
discussed ${topic.name} (related keywords: ${topic.keywords?.join(', ') || 'no keywords'}).

Focus on:
- Speeches and public statements
- Interviews and press conferences
- Official government communications
- Committee hearings or parliamentary sessions
- Press releases or official statements

Important: Only include events where ${publicFigure.name} personally spoke or made a statement about ${topic.name}.
Do not include events where others merely mentioned them or spoke about them.

For each relevant finding, structure the information as follows:

Return as JSON:
{
  "events": [{
    "title": "Brief description of the event (e.g., 'PM addresses UN General Assembly')",
    "eventDate": "YYYY-MM-DD",
    "summary": "2-3 sentences summarizing what ${publicFigure.name} said about ${topic.name}",
    "quotes": ["Direct quote 1 about ${topic.name}", "Direct quote 2 if available"],
    "sources": [{
      "url": "https://example.com/article",
      "publisher": "News Organization Name",
      "headline": "Original article headline"
    }]
  }]
}

If no relevant events are found, return: {"events": []}

Remember:
- Only include events from ${dateFilter}
- Focus on ${publicFigure.name}'s actual statements about ${topic.name}
- Provide direct quotes when available
- Include reputable sources only
`;
  }

  async estimateCost(tokenCount: number): Promise<number> {
    // Gemini 1.5 Pro pricing (approximate)
    // Input: $0.00125 per 1K tokens
    // Output: $0.005 per 1K tokens
    // Assume 80% input, 20% output for estimation
    const inputCost = (tokenCount * 0.8 / 1000) * 0.00125;
    const outputCost = (tokenCount * 0.2 / 1000) * 0.005;
    return inputCost + outputCost;
  }
}

// Singleton instance
let searchService: GeminiSearchService | null = null;

export function getSearchService(): GeminiSearchService {
  if (!searchService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    searchService = new GeminiSearchService(apiKey);
  }
  return searchService;
}