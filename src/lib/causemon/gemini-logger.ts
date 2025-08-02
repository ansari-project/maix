export class GeminiLogger {
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  logRequest(prompt: string, config: any = {}) {
    if (!this.enabled) return;
    
    console.log('\n🔵 [GEMINI REQUEST]', new Date().toISOString());
    console.log('Prompt:', prompt);
    console.log('Config:', JSON.stringify(config, null, 2));
  }

  logResponse(response: any, duration?: number) {
    if (!this.enabled) return;
    
    console.log('\n🟢 [GEMINI RESPONSE]', new Date().toISOString());
    if (duration) {
      console.log(`Duration: ${duration}ms`);
    }
    
    // Log the full response structure
    console.log('Response:', JSON.stringify(response, null, 2));
    
    // If it has text property, log it separately for clarity
    if (response?.text) {
      console.log('\nGenerated Text:');
      console.log(response.text);
    }
  }

  logError(error: any, prompt?: string) {
    if (!this.enabled) return;
    
    console.error('\n🔴 [GEMINI ERROR]', new Date().toISOString());
    if (prompt) {
      console.error('Failed prompt:', prompt);
    }
    console.error('Error:', error);
  }

  logStats(stats: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) {
    if (!this.enabled) return;
    
    console.log('\n📊 [GEMINI STATS]');
    console.log('Tokens used:', stats);
  }
}

// Singleton instance
let geminiLogger: GeminiLogger | null = null;

export function getGeminiLogger(): GeminiLogger {
  if (!geminiLogger) {
    // Enable logging based on environment variable
    const enabled = process.env.GEMINI_DEBUG === 'true' || process.env.NODE_ENV === 'development';
    geminiLogger = new GeminiLogger(enabled);
  }
  return geminiLogger;
}