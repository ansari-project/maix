import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { PublicFigure, Topic, Monitor } from '@prisma/client';

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
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      tools: [{
        googleSearchRetrieval: {}
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      }
    });
  }

  async searchForEvents(monitor: MonitorWithRelations): Promise<SearchResult> {
    const prompt = this.buildSearchPrompt(monitor);
    
    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
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
    
    // Build date filter
    const afterDate = monitor.lastSearchedAt 
      ? `after:${monitor.lastSearchedAt.toISOString().split('T')[0]}`
      : 'from the last 7 days';
    
    // Include aliases and keywords for better search coverage
    const figureNames = [publicFigure.name, ...(publicFigure.aliases || [])].join(' OR ');
    const topicKeywords = [topic.name, ...(topic.keywords || [])].join(' OR ');
    
    return `
Search for recent content ${afterDate} where ${publicFigure.name} 
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
- Only include events from ${afterDate}
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
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set');
    }
    searchService = new GeminiSearchService(apiKey);
  }
  return searchService;
}