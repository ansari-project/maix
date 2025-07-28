import { GeminiSearchService } from '../search-service';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

describe('GeminiSearchService', () => {
  let service: GeminiSearchService;
  let mockGenerateContent: jest.Mock;

  const mockMonitor = {
    id: 'monitor1',
    userId: 'user1',
    publicFigureId: 'pf1',
    topicId: 'topic1',
    isActive: true,
    emailFrequency: 'daily',
    lastSearchedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publicFigure: {
      id: 'pf1',
      name: 'John Doe',
      title: 'Prime Minister',
      imageUrl: null,
      aliases: ['JD', 'Johnny'],
      keywords: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    topic: {
      id: 'topic1',
      name: 'Climate Change',
      keywords: ['global warming', 'environment'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh mock for generateContent
    mockGenerateContent = jest.fn();
    
    // Override the mock implementation to return our mock
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }));
    
    service = new GeminiSearchService('test-api-key');
  });

  describe('searchForEvents', () => {
    it('should successfully parse and return search results', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            events: [
              {
                title: 'PM speaks about climate at UN',
                eventDate: '2024-01-15',
                summary: 'Prime Minister addresses climate action',
                quotes: ['We must act now', 'Climate change is real'],
                sources: [
                  {
                    url: 'https://example.com/article',
                    publisher: 'Example News',
                    headline: 'PM Climate Speech',
                  },
                ],
              },
            ],
          }),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.searchForEvents(mockMonitor);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('PM speaks about climate at UN');
      expect(result.events[0].quotes).toHaveLength(2);
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('John Doe'));
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('Climate Change'));
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({ events: [] }),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.searchForEvents(mockMonitor);

      expect(result.events).toHaveLength(0);
    });

    it('should retry on failure with exponential backoff', async () => {
      // First two calls fail, third succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify({ events: [] }),
          },
        });

      const startTime = Date.now();
      const result = await service.searchForEvents(mockMonitor);
      const endTime = Date.now();

      expect(result.events).toHaveLength(0);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      // Should have delays: 1s + 2s = 3s minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    });

    it('should throw error after 3 failed attempts', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Persistent error'));

      await expect(service.searchForEvents(mockMonitor)).rejects.toThrow(
        'Search failed after 3 attempts: Persistent error'
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('should validate response with Zod schema', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            events: [
              {
                title: 'Invalid event',
                eventDate: 'not-a-date', // Invalid date
                summary: 'Summary',
                quotes: [],
                sources: [],
              },
            ],
          }),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(service.searchForEvents(mockMonitor)).rejects.toThrow();
    });

    it('should handle missing aliases and keywords gracefully', async () => {
      const monitorWithoutAliases = {
        ...mockMonitor,
        publicFigure: {
          ...mockMonitor.publicFigure,
          aliases: undefined,
        },
        topic: {
          ...mockMonitor.topic,
          keywords: undefined,
        },
      };

      const mockResponse = {
        response: {
          text: () => JSON.stringify({ events: [] }),
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await service.searchForEvents(monitorWithoutAliases as any);

      expect(result.events).toHaveLength(0);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('no aliases')
      );
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost based on token count', async () => {
      const cost = await service.estimateCost(1000);
      
      // 1000 tokens: 80% input (800) * $0.00125/1K + 20% output (200) * $0.005/1K
      const expectedCost = (800 / 1000) * 0.00125 + (200 / 1000) * 0.005;
      
      expect(cost).toBeCloseTo(expectedCost, 6);
    });
  });
});