import { NextRequest } from 'next/server';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';
import { getSearchService } from '@/lib/causemon/search-service';
import { getEventProcessor } from '@/lib/causemon/event-processor';
import { getEmailService } from '@/lib/causemon/email-service';
import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    monitor: {
      findMany: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/causemon/search-service', () => ({
  getSearchService: jest.fn(),
}));

jest.mock('@/lib/causemon/event-processor', () => ({
  getEventProcessor: jest.fn(),
}));

jest.mock('@/lib/causemon/email-service', () => ({
  getEmailService: jest.fn(),
}));

describe('/api/cron/causemon-daily', () => {
  const mockSearchService = {
    searchForEvents: jest.fn(),
  };

  const mockEventProcessor = {
    processSearchResults: jest.fn(),
  };

  const mockEmailService = {
    sendDailyDigest: jest.fn(),
  };

  const mockMonitors = [
    {
      id: 'monitor1',
      userId: 'user1',
      publicFigureId: 'pf1',
      topicId: 'topic1',
      isActive: true,
      user: {
        id: 'user1',
        email: 'user1@example.com',
        name: 'User One',
      },
      publicFigure: {
        id: 'pf1',
        name: 'John Doe',
      },
      topic: {
        id: 'topic1',
        name: 'Climate Change',
      },
    },
    {
      id: 'monitor2',
      userId: 'user2',
      publicFigureId: 'pf2',
      topicId: 'topic2',
      isActive: true,
      user: {
        id: 'user2',
        email: 'user2@example.com',
        name: 'User Two',
      },
      publicFigure: {
        id: 'pf2',
        name: 'Jane Smith',
      },
      topic: {
        id: 'topic2',
        name: 'Healthcare',
      },
    },
  ];

  const mockEvents = [
    {
      id: 'event1',
      title: 'PM speaks on climate',
      publicFigure: { id: 'pf1', name: 'John Doe' },
      topic: { id: 'topic1', name: 'Climate Change' },
      articles: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';

    (getSearchService as jest.Mock).mockReturnValue(mockSearchService);
    (getEventProcessor as jest.Mock).mockReturnValue(mockEventProcessor);
    (getEmailService as jest.Mock).mockReturnValue(mockEmailService);
  });

  it('should return 401 if auth header is missing', async () => {
    const request = new NextRequest('http://localhost/api/cron/causemon-daily');
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized');
  });

  it('should return 401 if auth header is incorrect', async () => {
    const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
      headers: {
        Authorization: 'Bearer wrong-secret',
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should process monitors and send emails successfully', async () => {
    (prisma.monitor.findMany as jest.Mock).mockResolvedValue(mockMonitors);
    
    mockSearchService.searchForEvents.mockResolvedValue({
      events: [{ title: 'Event 1' }],
    });
    
    mockEventProcessor.processSearchResults
      .mockResolvedValueOnce({ created: 1, skipped: 0 })
      .mockResolvedValueOnce({ created: 0, skipped: 1 });

    (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
      headers: {
        Authorization: 'Bearer test-secret',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      monitorsProcessed: 2,
      emailsSent: 1,
    });

    // Verify search was called for each monitor
    expect(mockSearchService.searchForEvents).toHaveBeenCalledTimes(2);
    expect(mockSearchService.searchForEvents).toHaveBeenCalledWith(mockMonitors[0]);
    expect(mockSearchService.searchForEvents).toHaveBeenCalledWith(mockMonitors[1]);

    // Verify event processing
    expect(mockEventProcessor.processSearchResults).toHaveBeenCalledTimes(2);

    // Verify email was sent only for user1 (who had new events)
    expect(mockEmailService.sendDailyDigest).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendDailyDigest).toHaveBeenCalledWith(
      'user1@example.com',
      'User One',
      mockEvents
    );

    // Verify lastDigestSentAt was updated
    expect((prisma.user.update as jest.Mock)).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { lastDigestSentAt: expect.any(Date) },
    });
  });

  it('should handle search failures gracefully', async () => {
    (prisma.monitor.findMany as jest.Mock).mockResolvedValue([mockMonitors[0]]);
    
    mockSearchService.searchForEvents.mockRejectedValue(new Error('Search failed'));

    const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
      headers: {
        Authorization: 'Bearer test-secret',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      monitorsProcessed: 1,
      emailsSent: 0,
    });

    // Email should not be sent
    expect(mockEmailService.sendDailyDigest).not.toHaveBeenCalled();
  });

  it('should handle email failures gracefully', async () => {
    (prisma.monitor.findMany as jest.Mock).mockResolvedValue([mockMonitors[0]]);
    
    mockSearchService.searchForEvents.mockResolvedValue({
      events: [{ title: 'Event 1' }],
    });
    
    mockEventProcessor.processSearchResults.mockResolvedValue({ created: 1, skipped: 0 });
    (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);
    
    mockEmailService.sendDailyDigest.mockRejectedValue(new Error('Email failed'));

    const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
      headers: {
        Authorization: 'Bearer test-secret',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      monitorsProcessed: 1,
      emailsSent: 0,
    });
  });

  it('should not send email if no new events', async () => {
    (prisma.monitor.findMany as jest.Mock).mockResolvedValue([mockMonitors[0]]);
    
    mockSearchService.searchForEvents.mockResolvedValue({
      events: [],
    });
    
    mockEventProcessor.processSearchResults.mockResolvedValue({ created: 0, skipped: 0 });

    const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
      headers: {
        Authorization: 'Bearer test-secret',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockEmailService.sendDailyDigest).not.toHaveBeenCalled();
  });

  it('should handle global errors', async () => {
    (prisma.monitor.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const request = new NextRequest('http://localhost/api/cron/causemon-daily', {
      headers: {
        Authorization: 'Bearer test-secret',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Cron job failed');
  });
});