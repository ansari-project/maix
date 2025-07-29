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
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    topic: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
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

    it('should create monitor successfully with new public figure and topic', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.publicFigure.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.topic.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.publicFigure.create as jest.Mock).mockResolvedValue({ id: 'pf1', name: 'Anthony Albanese' });
      (prisma.topic.create as jest.Mock).mockResolvedValue({ id: 'topic1', name: 'Palestine' });
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      
      const mockMonitor = {
        id: 'monitor1',
        userId: 'user123',
        publicFigureId: 'pf1',
        topicId: 'topic1',
        isActive: true,
        emailFrequency: 'daily',
        publicFigure: { id: 'pf1', name: 'Anthony Albanese' },
        topic: { id: 'topic1', name: 'Palestine' },
      };

      (prisma.monitor.create as jest.Mock).mockResolvedValue(mockMonitor);

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureName: 'Anthony Albanese',
          topicName: 'Palestine',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(mockMonitor);
    });

    it('should return 409 if monitor already exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.publicFigure.findFirst as jest.Mock).mockResolvedValue({ id: 'pf1', name: 'John Doe' });
      (prisma.topic.findFirst as jest.Mock).mockResolvedValue({ id: 'topic1', name: 'Climate Change' });
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing',
        userId: 'user123',
        publicFigureId: 'pf1',
        topicId: 'topic1',
      });

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureName: 'John Doe',
          topicName: 'Climate Change',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Monitor already exists for this combination');
    });

    it('should create monitor with existing public figure and topic', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.publicFigure.findFirst as jest.Mock).mockResolvedValue({ id: 'pf1', name: 'John Doe' });
      (prisma.topic.findFirst as jest.Mock).mockResolvedValue({ id: 'topic1', name: 'Climate Change' });
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      
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
          publicFigureName: 'John Doe',
          topicName: 'Climate Change',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(mockMonitor);
    });

    it('should create public figure and topic with empty arrays for aliases and keywords', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.publicFigure.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.topic.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.publicFigure.create as jest.Mock).mockResolvedValue({ 
        id: 'pf1', 
        name: 'New Person',
        aliases: [] 
      });
      (prisma.topic.create as jest.Mock).mockResolvedValue({ 
        id: 'topic1', 
        name: 'New Topic',
        keywords: []
      });
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      
      const mockMonitor = {
        id: 'monitor1',
        userId: 'user123',
        publicFigureId: 'pf1',
        topicId: 'topic1',
        isActive: true,
        emailFrequency: 'daily',
        publicFigure: { id: 'pf1', name: 'New Person', aliases: [] },
        topic: { id: 'topic1', name: 'New Topic', keywords: [] },
      };

      (prisma.monitor.create as jest.Mock).mockResolvedValue(mockMonitor);

      const request = new NextRequest('http://localhost/api/causemon/monitors', {
        method: 'POST',
        body: JSON.stringify({
          publicFigureName: 'New Person',
          topicName: 'New Topic',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      
      // Verify that create was called with empty arrays
      expect(prisma.publicFigure.create).toHaveBeenCalledWith({
        data: {
          name: 'New Person',
          aliases: []
        }
      });
      
      expect(prisma.topic.create).toHaveBeenCalledWith({
        data: {
          name: 'New Topic',
          keywords: []
        }
      });
    });

    it('should handle case-insensitive matching for names', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.publicFigure.findFirst as jest.Mock).mockResolvedValue({ id: 'pf1', name: 'John Doe' });
      (prisma.topic.findFirst as jest.Mock).mockResolvedValue({ id: 'topic1', name: 'Climate Change' });
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);
      
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
          publicFigureName: 'JOHN DOE',
          topicName: 'climate change',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      
      // Verify case-insensitive search was performed
      expect(prisma.publicFigure.findFirst).toHaveBeenCalledWith({
        where: {
          name: {
            equals: 'JOHN DOE',
            mode: 'insensitive'
          }
        }
      });
    });
  });
});