import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    monitor: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

describe('/api/causemon/monitors/[id]', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
    },
  };

  const mockMonitor = {
    id: 'monitor1',
    userId: 'user123',
    publicFigureId: 'pf1',
    topicId: 'topic1',
    isActive: true,
    emailFrequency: 'daily',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors/monitor1', {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'monitor1' }) });
      expect(response.status).toBe(401);
    });

    it('should return 404 if monitor not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors/invalid', {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid' }) });
      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own monitor', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue({
        ...mockMonitor,
        userId: 'otheruser',
      });

      const request = new NextRequest('http://localhost/api/causemon/monitors/monitor1', {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'monitor1' }) });
      expect(response.status).toBe(403);
    });

    it('should update monitor successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(mockMonitor);
      
      const updatedMonitor = {
        ...mockMonitor,
        isActive: false,
        publicFigure: { id: 'pf1', name: 'John Doe' },
        topic: { id: 'topic1', name: 'Climate Change' },
      };

      (prisma.monitor.update as jest.Mock).mockResolvedValue(updatedMonitor);

      const request = new NextRequest('http://localhost/api/causemon/monitors/monitor1', {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'monitor1' }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(updatedMonitor);
      expect(prisma.monitor.update).toHaveBeenCalledWith({
        where: { id: 'monitor1' },
        data: { isActive: false },
        include: {
          publicFigure: true,
          topic: true,
        },
      });
    });
  });

  describe('DELETE', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors/monitor1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'monitor1' }) });
      expect(response.status).toBe(401);
    });

    it('should return 404 if monitor not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/causemon/monitors/invalid', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'invalid' }) });
      expect(response.status).toBe(404);
    });

    it('should return 403 if user does not own monitor', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue({
        ...mockMonitor,
        userId: 'otheruser',
      });

      const request = new NextRequest('http://localhost/api/causemon/monitors/monitor1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'monitor1' }) });
      expect(response.status).toBe(403);
    });

    it('should delete monitor successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(mockMonitor);
      (prisma.monitor.delete as jest.Mock).mockResolvedValue(mockMonitor);

      const request = new NextRequest('http://localhost/api/causemon/monitors/monitor1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'monitor1' }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(prisma.monitor.delete).toHaveBeenCalledWith({
        where: { id: 'monitor1' },
      });
    });
  });
});