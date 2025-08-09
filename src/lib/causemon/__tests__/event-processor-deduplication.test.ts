import { EventProcessor } from '../event-processor';
import { prisma } from '@/lib/prisma';
import { SearchResult } from '../search-service';
import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    article: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    monitor: {
      update: jest.fn(),
    },
  },
}));

describe('EventProcessor Deduplication', () => {
  let eventProcessor: EventProcessor;
  const mockMonitorId = 'monitor-123';
  const mockPublicFigureId = 'figure-123';
  const mockTopicId = 'topic-123';

  beforeEach(() => {
    eventProcessor = new EventProcessor();
    jest.clearAllMocks();
  });

  describe('sourceUrl uniqueness constraint handling', () => {
    it('should handle duplicate sourceUrl gracefully', async () => {
      const searchResults: SearchResult = {
        success: true,
        events: [
          {
            title: 'Press Conference at Parliament House',
            eventDate: '2025-01-01T12:00:00Z',
            summary: 'PM discusses current issues',
            quotes: ['Important quote'],
            sources: [
              {
                headline: 'PM Speaks on Issues',
                url: 'https://example.com/article-1',
                publisher: 'News Source',
              },
            ],
          },
        ],
      };

      // Mock that event doesn't exist (new event)
      (prisma.event.findUnique as any).mockResolvedValue(null);
      
      // Mock successful event creation
      const mockEvent = { id: 'event-123' };
      (prisma.event.create as any).mockResolvedValue(mockEvent);
      
      // Mock article creation failure due to unique constraint
      const uniqueConstraintError = new Error('Unique constraint failed');
      (uniqueConstraintError as any).code = 'P2002';
      (prisma.article.create as any).mockRejectedValue(uniqueConstraintError);
      
      // Mock finding existing article
      const existingArticle = { id: 'article-123', sourceUrl: 'https://example.com/article-1' };
      (prisma.article.findUnique as any).mockResolvedValue(existingArticle);
      
      // Mock monitor update
      (prisma.monitor.update as any).mockResolvedValue({});

      const result = await eventProcessor.processSearchResults(
        searchResults,
        mockMonitorId,
        mockPublicFigureId,
        mockTopicId
      );

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
      expect(prisma.event.create).toHaveBeenCalledTimes(1);
      expect(prisma.article.create).toHaveBeenCalledTimes(1);
      expect(prisma.article.findUnique).toHaveBeenCalledWith({
        where: { sourceUrl: 'https://example.com/article-1' }
      });
    });

    it('should handle multiple events sharing same source URL', async () => {
      const searchResults: SearchResult = {
        success: true,
        events: [
          {
            title: 'Event One',
            eventDate: '2025-01-01T12:00:00Z',
            summary: 'First event summary',
            quotes: ['Quote one'],
            sources: [
              {
                headline: 'Shared Article Headline',
                url: 'https://example.com/shared-article',
                publisher: 'News Source',
              },
            ],
          },
          {
            title: 'Event Two', 
            eventDate: '2025-01-02T12:00:00Z',
            summary: 'Second event summary',
            quotes: ['Quote two'],
            sources: [
              {
                headline: 'Shared Article Headline',
                url: 'https://example.com/shared-article', // Same URL as above
                publisher: 'News Source',
              },
            ],
          },
        ],
      };

      // Mock that events don't exist (both new)
      (prisma.event.findUnique as any).mockResolvedValue(null);
      
      // Mock successful event creation for both events
      (prisma.event.create as any)
        .mockResolvedValueOnce({ id: 'event-1' })
        .mockResolvedValueOnce({ id: 'event-2' });
      
      // Mock first article creation succeeds, second fails due to unique constraint
      (prisma.article.create as any)
        .mockResolvedValueOnce({ id: 'article-1' })
        .mockImplementationOnce(() => {
          const error = new Error('Unique constraint failed');
          (error as any).code = 'P2002';
          return Promise.reject(error);
        });
      
      // Mock finding existing article for second event
      const existingArticle = { id: 'article-1', sourceUrl: 'https://example.com/shared-article' };
      (prisma.article.findUnique as any).mockResolvedValue(existingArticle);
      
      // Mock monitor update
      (prisma.monitor.update as any).mockResolvedValue({});

      const result = await eventProcessor.processSearchResults(
        searchResults,
        mockMonitorId,
        mockPublicFigureId,
        mockTopicId
      );

      expect(result.created).toBe(2); // Both events created successfully
      expect(result.skipped).toBe(0);
      expect(prisma.event.create).toHaveBeenCalledTimes(2);
      expect(prisma.article.create).toHaveBeenCalledTimes(2);
      expect(prisma.article.findUnique).toHaveBeenCalledTimes(1); // Only called for second event
    });

    it('should re-throw non-uniqueness article creation errors', async () => {
      const searchResults: SearchResult = {
        success: true,
        events: [
          {
            title: 'Test Event',
            eventDate: '2025-01-01T12:00:00Z',
            summary: 'Test summary',
            quotes: [],
            sources: [
              {
                headline: 'Test Article',
                url: 'https://example.com/test-article',
                publisher: 'Test Publisher',
              },
            ],
          },
        ],
      };

      // Mock that event doesn't exist
      (prisma.event.findUnique as any).mockResolvedValue(null);
      
      // Mock successful event creation
      (prisma.event.create as any).mockResolvedValue({ id: 'event-123' });
      
      // Mock article creation failure with different error (not P2002)
      const networkError = new Error('Network timeout');
      (prisma.article.create as any).mockRejectedValue(networkError);

      const result = await eventProcessor.processSearchResults(
        searchResults,
        mockMonitorId,
        mockPublicFigureId,
        mockTopicId
      );

      expect(result.created).toBe(0); // Event creation failed due to article error
      expect(result.skipped).toBe(1);
    });
  });

  describe('event deduplication hash', () => {
    it('should skip events with existing deduplication hash', async () => {
      const searchResults: SearchResult = {
        success: true,
        events: [
          {
            title: 'Duplicate Event',
            eventDate: '2025-01-01T12:00:00Z',
            summary: 'Test summary',
            quotes: [],
            sources: [
              {
                headline: 'Test Article',
                url: 'https://example.com/test-article',
                publisher: 'Test Publisher',
              },
            ],
          },
        ],
      };

      // Mock that event already exists
      const existingEvent = {
        id: 'existing-event-123',
        createdAt: new Date('2024-12-31T12:00:00Z'),
      };
      (prisma.event.findUnique as any).mockResolvedValue(existingEvent);
      
      // Mock monitor update
      (prisma.monitor.update as any).mockResolvedValue({});

      const result = await eventProcessor.processSearchResults(
        searchResults,
        mockMonitorId,
        mockPublicFigureId,
        mockTopicId
      );

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(prisma.event.create).not.toHaveBeenCalled();
      expect(prisma.article.create).not.toHaveBeenCalled();
    });

    it('should generate consistent hash for same event details', async () => {
      const eventProcessor = new EventProcessor();
      
      // Access private method via any cast for testing
      const createEventHash = (eventProcessor as any).createEventHash;
      
      const hash1 = createEventHash('Test Event', '2025-01-01T12:00:00Z', 'figure-123');
      const hash2 = createEventHash('Test Event', '2025-01-01T12:00:00Z', 'figure-123');
      const hash3 = createEventHash('test event', '2025-01-01T12:00:00Z', 'figure-123'); // Different case
      const hash4 = createEventHash('Test Event!', '2025-01-01T12:00:00Z', 'figure-123'); // With punctuation
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3); // Should be same due to normalization
      expect(hash1).toBe(hash4); // Should be same due to special char removal
    });

    it('should generate different hash for different event details', async () => {
      const eventProcessor = new EventProcessor();
      
      // Access private method via any cast for testing
      const createEventHash = (eventProcessor as any).createEventHash;
      
      const hash1 = createEventHash('Event One', '2025-01-01T12:00:00Z', 'figure-123');
      const hash2 = createEventHash('Event Two', '2025-01-01T12:00:00Z', 'figure-123'); // Different title
      const hash3 = createEventHash('Event One', '2025-01-02T12:00:00Z', 'figure-123'); // Different date
      const hash4 = createEventHash('Event One', '2025-01-01T12:00:00Z', 'figure-456'); // Different figure
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).not.toBe(hash4);
    });
  });

  describe('error handling', () => {
    it('should handle invalid event dates gracefully', async () => {
      const searchResults: SearchResult = {
        success: true,
        events: [
          {
            title: 'Event with invalid date',
            eventDate: 'invalid-date-string',
            summary: 'Test summary',
            quotes: [],
            sources: [
              {
                headline: 'Test Article',
                url: 'https://example.com/test-article',
                publisher: 'Test Publisher',
              },
            ],
          },
        ],
      };

      // Mock that event doesn't exist
      (prisma.event.findUnique as any).mockResolvedValue(null);
      
      // Mock monitor update
      (prisma.monitor.update as any).mockResolvedValue({});

      const result = await eventProcessor.processSearchResults(
        searchResults,
        mockMonitorId,
        mockPublicFigureId,
        mockTopicId
      );

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('should continue processing other events if one fails', async () => {
      const searchResults: SearchResult = {
        success: true,
        events: [
          {
            title: 'Valid Event',
            eventDate: '2025-01-01T12:00:00Z',
            summary: 'Valid summary',
            quotes: [],
            sources: [
              {
                headline: 'Valid Article',
                url: 'https://example.com/valid-article',
                publisher: 'Valid Publisher',
              },
            ],
          },
          {
            title: 'Invalid Event',
            eventDate: 'invalid-date',
            summary: 'Invalid summary',
            quotes: [],
            sources: [
              {
                headline: 'Invalid Article',
                url: 'https://example.com/invalid-article',
                publisher: 'Invalid Publisher',
              },
            ],
          },
        ],
      };

      // Mock that events don't exist
      (prisma.event.findUnique as any).mockResolvedValue(null);
      
      // Mock successful event and article creation for first event
      (prisma.event.create as any).mockResolvedValue({ id: 'event-123' });
      (prisma.article.create as any).mockResolvedValue({ id: 'article-123' });
      
      // Mock monitor update
      (prisma.monitor.update as any).mockResolvedValue({});

      const result = await eventProcessor.processSearchResults(
        searchResults,
        mockMonitorId,
        mockPublicFigureId,
        mockTopicId
      );

      expect(result.created).toBe(1); // Only valid event created
      expect(result.skipped).toBe(1); // Invalid event skipped
      expect(prisma.event.create).toHaveBeenCalledTimes(1);
      expect(prisma.article.create).toHaveBeenCalledTimes(1);
    });
  });
});