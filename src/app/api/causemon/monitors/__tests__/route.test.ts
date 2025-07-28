import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    monitor: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    publicFigure: {
      findUnique: jest.fn(),
    },
    topic: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

describe('/api/causemon/monitors', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user monitors when authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      
      const mockMonitors = [
        {
          id: 'monitor1',
          userId: 'user123',
          publicFigure: { id: 'pf1', name: 'John Doe' },
          topic: { id: 'topic1', name: 'Climate Change' },
          isActive: true,
          emailFrequency: 'daily',
          createdAt: new Date(),
        },
      ];

      (prisma.monitor.findMany as jest.Mock).mockResolvedValue(mockMonitors);

      const request = new NextRequest('http://localhost/api/causemon/monitors');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([
        {
          ...mockMonitors[0],
          createdAt: mockMonitors[0].createdAt.toISOString(),
        },
      ]);
      expect(prisma.monitor.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        include: {
          publicFigure: {
            select: {
              id: true,
              name: true,
              title: true,
              imageUrl: true,
            },
          },
          topic: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureId: 'pf1',
          topicId: 'topic1',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 if required fields are missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Public figure and topic are required');
    });

    it('should return 400 if user already has a monitor', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.monitor.count as jest.Mock).mockResolvedValue(1);
      (prisma.publicFigure.findUnique as jest.Mock).mockResolvedValue({ id: 'pf1' });
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue({ id: 'topic1' });

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureId: 'pf1',
          topicId: 'topic1',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('You can only have one monitor in the beta version');
    });

    it('should return 400 if public figure does not exist', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.monitor.count as jest.Mock).mockResolvedValue(0);
      (prisma.publicFigure.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureId: 'invalid',
          topicId: 'topic1',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid public figure');
    });

    it('should return 400 if topic does not exist', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.monitor.count as jest.Mock).mockResolvedValue(0);
      (prisma.publicFigure.findUnique as jest.Mock).mockResolvedValue({ id: 'pf1' });
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureId: 'pf1',
          topicId: 'invalid',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid topic');
    });

    it('should create monitor successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.monitor.count as jest.Mock).mockResolvedValue(0);
      (prisma.publicFigure.findUnique as jest.Mock).mockResolvedValue({ id: 'pf1' });
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue({ id: 'topic1' });
      
      const mockMonitor = {
        id: 'monitor1',
        userId: 'user123',
        publicFigureId: 'pf1',
        topicId: 'topic1',
        isActive: true,
        emailFrequency: 'daily',
        publicFigure: { id: 'pf1', name: 'John Doe' },
        topic: { id: 'topic1', name: 'Climate Change' },
      };

      (prisma.monitor.create as jest.Mock).mockResolvedValue(mockMonitor);

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureId: 'pf1',
          topicId: 'topic1',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(mockMonitor);
      expect(prisma.monitor.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          publicFigureId: 'pf1',
          topicId: 'topic1',
          emailFrequency: 'daily',
        },
        include: {
          publicFigure: true,
          topic: true,
        },
      });
    });
  });
});