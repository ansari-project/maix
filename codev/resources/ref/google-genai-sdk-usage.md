# Google Generative AI SDK Usage Guide

## Overview

This guide covers the proper usage of Google's Generative AI SDK for the Gemini API in the MAIX project. As of August 2025, Google has consolidated their JavaScript/TypeScript SDK under the `@google/genai` package.

## CRITICAL: Package Name

**ALWAYS use `@google/genai`** - This is the CANONICAL and ONLY library to use UNDER ALL CIRCUMSTANCES.

❌ **DO NOT USE**:
- `@google/generative-ai` (different API structure)
- `@google-ai/generativelanguage` (old)
- Any other Google AI packages

## Installation

```bash
npm install @google/genai
```

## Basic Usage

```typescript
import { GoogleGenAI } from '@google/genai';

// Initialize the client with options object
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Generate content using the models API
const result = await genAI.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: 'Your prompt here',
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 4096,
  }
});

// Access the response text directly
const text = result.text;
```

## Google Search Grounding

For Gemini models with search grounding:

```typescript
const result = await genAI.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: 'Your search query here',
  tools: [{
    googleSearch: {}  // Note: googleSearch, not googleSearchRetrieval
  }],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 4096,
  }
});
```

### Important Notes on Search Grounding:
- **All Gemini models**: Use `googleSearch: {}`
- **Cost**: $35 per 1,000 grounded queries (paid tier required)
- **Limit**: 1 million queries per day

## Environment Variables

Always use `GEMINI_API_KEY` (not GOOGLE_API_KEY):

```env
GEMINI_API_KEY=your-api-key-here
```

## Error Handling

```typescript
try {
  const result = await genAI.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  // Process result
} catch (error) {
  if (error.message.includes('Search Grounding is not supported')) {
    // Model doesn't support search grounding
    // Consider falling back to a different model
  }
  // Handle other errors
}
```

## Model Selection

As of August 2025, these models are available:
- `gemini-2.5-pro` - Latest and most capable
- `gemini-2.0-flash` - Faster, good for simpler tasks
- `gemini-1.5-pro` - Stable, widely supported
- `gemini-1.5-flash` - Fast, lightweight

## Key API Differences from @google/generative-ai

This package (`@google/genai`) has a different API structure:

1. **Initialization**: Takes an options object, not a string
   ```typescript
   // Correct
   const genAI = new GoogleGenAI({ apiKey: 'key' });
   
   // Wrong
   const genAI = new GoogleGenAI('key');
   ```

2. **Model Access**: Use `genAI.models.generateContent()` directly
   ```typescript
   // Correct
   const result = await genAI.models.generateContent({...});
   
   // Wrong (this is @google/generative-ai syntax)
   const model = genAI.getGenerativeModel({...});
   const result = await model.generateContent(...);
   ```

3. **Response Access**: Text is available directly on result
   ```typescript
   // Correct
   const text = result.text;
   
   // Wrong (this is @google/generative-ai syntax)
   const response = await result.response;
   const text = response.text();
   ```

## Best Practices

1. **Always validate the package** you're using - check package.json
2. **Run `npm run build`** after making changes to catch type errors
3. **Use structured output** when possible for consistent responses
4. **Implement retry logic** with exponential backoff
5. **Log requests and responses** for debugging (see gemini-logger.ts)
6. **Monitor token usage** to control costs

## Testing

Always test with multiple scenarios:
- With and without search grounding
- Different prompt types
- Error cases (rate limits, invalid API key, etc.)

## References

- [Official Documentation](https://ai.google.dev/gemini-api/docs)
- [SDK GitHub Repository](https://github.com/googleapis/js-genai)
- [Model Pricing](https://ai.google.dev/pricing)