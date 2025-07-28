import { EventProcessor } from '../event-processor';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    monitor: {
      update: jest.fn(),
    },
  },
}));

describe('EventProcessor', () => {
  let processor: EventProcessor;

  const mockSearchResult = {
    events: [
      {
        title: 'PM speaks on climate change',
        eventDate: '2024-01-15',
        summary: 'Prime Minister addresses climate action',
        quotes: ['We must act now', 'Climate change is real'],
        sources: [
          {
            url: 'https://example.com/article1',
            publisher: 'Example News',
            headline: 'PM Climate Speech',
          },
        ],
      },
      {
        title: 'PM announces new policy',
        eventDate: '2024-01-16',
        summary: 'New environmental policy announced',
        quotes: ['This is a game changer'],
        sources: [
          {
            url: 'https://example.com/article2',
            publisher: 'Daily News',
            headline: 'New Policy Announced',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new EventProcessor();
  });

  describe('processSearchResults', () => {
    it('should create new events and skip duplicates', async () => {
      // First event exists, second is new
      (prisma.event.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing' }) // First event exists
        .mockResolvedValueOnce(null); // Second event is new

      (prisma.event.create as jest.Mock).mockResolvedValue({ id: 'new-event' });
      (prisma.monitor.update as jest.Mock).mockResolvedValue({});

      const result = await processor.processSearchResults(
        mockSearchResult,
        'monitor1',
        'pf1',
        'topic1'
      );

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(prisma.event.create).toHaveBeenCalledTimes(1);
      expect(prisma.monitor.update).toHaveBeenCalledWith({
        where: { id: 'monitor1' },
        data: { lastSearchedAt: expect.any(Date) },
      });
    });

    it('should handle invalid event dates', async () => {
      const invalidResult = {
        events: [
          {
            title: 'Invalid date event',
            eventDate: 'invalid-date',
            summary: 'Summary',
            quotes: [],
            sources: [],
          },
        ],
      };

      const result = await processor.processSearchResults(
        invalidResult,
        'monitor1',
        'pf1',
        'topic1'
      );

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it('should create events with proper deduplication hash', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.event.create as jest.Mock).mockResolvedValue({ id: 'new-event' });

      await processor.processSearchResults(
        { events: [mockSearchResult.events[0]] },
        'monitor1',
        'pf1',
        'topic1'
      );

      const expectedHash = createHash('md5')
        .update('pmspeaksonclimatechange-2024-01-15-pf1')
        .digest('hex');

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { deduplicationHash: expectedHash },
      });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deduplicationHash: expectedHash,
          publicFigureId: 'pf1',
          topicId: 'topic1',
          title: 'PM speaks on climate change',
          eventType: 'speech',
        }),
      });
    });

    it('should infer event types correctly', async () => {
      const eventsWithTypes = {
        events: [
          { ...mockSearchResult.events[0], title: 'PM delivers speech' },
          { ...mockSearchResult.events[0], title: 'PM in interview with BBC' },
          { ...mockSearchResult.events[0], title: 'PM makes statement' },
          { ...mockSearchResult.events[0], title: 'MP voted on bill' },
        ],
      };

      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.event.create as jest.Mock).mockImplementation(({ data }) => ({ 
        id: 'new', 
        eventType: data.eventType 
      }));

      await processor.processSearchResults(
        eventsWithTypes,
        'monitor1',
        'pf1',
        'topic1'
      );

      const createCalls = (prisma.event.create as jest.Mock).mock.calls;
      expect(createCalls[0][0].data.eventType).toBe('speech');
      expect(createCalls[1][0].data.eventType).toBe('interview');
      expect(createCalls[2][0].data.eventType).toBe('statement');
      expect(createCalls[3][0].data.eventType).toBe('vote');
    });

    it('should handle errors gracefully', async () => {
      (prisma.event.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await processor.processSearchResults(
        mockSearchResult,
        'monitor1',
        'pf1',
        'topic1'
      );

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(2);
    });

    it('should store quotes in articles', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.event.create as jest.Mock).mockResolvedValue({ id: 'new-event' });

      await processor.processSearchResults(
        { events: [mockSearchResult.events[0]] },
        'monitor1',
        'pf1',
        'topic1'
      );

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          articles: {
            create: expect.arrayContaining([
              expect.objectContaining({
                keyQuotes: ['We must act now', 'Climate change is real'],
              }),
            ]),
          },
        }),
      });
    });
  });
});