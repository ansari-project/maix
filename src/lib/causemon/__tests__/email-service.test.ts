import { EmailService } from '../email-service';
import { Resend } from 'resend';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM = 'test@example.com';
  process.env.NEXT_PUBLIC_URL = 'https://example.com';
});

afterEach(() => {
  process.env = originalEnv;
});

describe('EmailService', () => {
  let service: EmailService;
  let mockSend: jest.Mock;

  const mockEvents = [
    {
      id: 'event1',
      publicFigureId: 'pf1',
      topicId: 'topic1',
      title: 'PM speaks on climate',
      summary: 'Prime Minister addresses climate action at UN',
      eventDate: new Date('2024-01-15'),
      eventType: 'speech',
      sentiment: null,
      stance: null,
      deduplicationHash: 'hash1',
      createdAt: new Date(),
      updatedAt: new Date(),
      publicFigure: {
        id: 'pf1',
        name: 'John Doe',
        title: 'Prime Minister',
        imageUrl: null,
        aliases: [],
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      topic: {
        id: 'topic1',
        name: 'Climate Change',
        keywords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      articles: [
        {
          id: 'article1',
          eventId: 'event1',
          headline: 'PM Climate Speech',
          sourceUrl: 'https://news.com/article',
          sourceType: 'media',
          sourcePublisher: 'News Corp',
          publishedAt: new Date(),
          fullText: null,
          keyQuotes: ['We must act now'],
          contentHash: 'hash',
          createdAt: new Date(),
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh mock for send
    mockSend = jest.fn();
    
    // Override the mock implementation
    (Resend as jest.Mock).mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    }));
    
    service = new EmailService();
  });

  describe('constructor', () => {
    it('should throw error if RESEND_API_KEY is not set', () => {
      delete process.env.RESEND_API_KEY;
      expect(() => new EmailService()).toThrow('RESEND_API_KEY is not set');
    });
  });

  describe('sendDailyDigest', () => {
    it('should send email with events', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' });

      await service.sendDailyDigest('user@example.com', 'John Smith', mockEvents);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Causemon Daily: 1 new events',
        html: expect.stringContaining('PM speaks on climate'),
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('John Smith');
      expect(callArgs.html).toContain('John Doe');
      expect(callArgs.html).toContain('Climate Change');
      expect(callArgs.html).toContain('Prime Minister addresses climate action at UN');
    });

    it('should not send email if no events', async () => {
      await service.sendDailyDigest('user@example.com', 'John Smith', []);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should use default from address if EMAIL_FROM not set', async () => {
      delete process.env.EMAIL_FROM;
      mockSend.mockResolvedValue({ id: 'email-id' });

      await service.sendDailyDigest('user@example.com', 'John Smith', mockEvents);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Maix <ai-noreply@maix.io>',
        to: 'user@example.com',
        subject: expect.any(String),
        html: expect.any(String),
      });
    });

    it('should handle user without name', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' });

      await service.sendDailyDigest('user@example.com', '', mockEvents);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Hi there,');
    });

    it('should include multiple events', async () => {
      const multipleEvents = [
        ...mockEvents,
        {
          ...mockEvents[0],
          id: 'event2',
          title: 'PM announces new policy',
          summary: 'New environmental policy revealed',
        },
      ];

      mockSend.mockResolvedValue({ id: 'email-id' });

      await service.sendDailyDigest('user@example.com', 'John', multipleEvents);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Causemon Daily: 2 new events',
        html: expect.any(String),
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('PM speaks on climate');
      expect(callArgs.html).toContain('PM announces new policy');
    });

    it('should include manage monitors link', async () => {
      mockSend.mockResolvedValue({ id: 'email-id' });

      await service.sendDailyDigest('user@example.com', 'John', mockEvents);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('https://example.com/causemon');
      expect(callArgs.html).toContain('Manage monitors');
    });
  });
});