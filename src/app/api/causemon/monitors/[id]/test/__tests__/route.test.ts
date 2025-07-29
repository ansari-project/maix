import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    monitor: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

describe('/api/causemon/monitors/[id]/test', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
    },
  };

  const mockParams = Promise.resolve({ id: 'monitor123' });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_API_KEY;
  });

  it('should return 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/causemon/monitors/monitor123/test', {
      method: 'POST',
    });

    const response = await POST(request, { params: mockParams });
    expect(response.status).toBe(401);
  });

  it('should return 404 if monitor not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/causemon/monitors/monitor123/test', {
      method: 'POST',
    });

    const response = await POST(request, { params: mockParams });
    expect(response.status).toBe(404);
  });

  it('should return 403 if monitor belongs to different user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.monitor.findUnique as jest.Mock).mockResolvedValue({
      id: 'monitor123',
      userId: 'different-user',
      publicFigure: { name: 'John Doe', aliases: [] },
      topic: { name: 'Climate', keywords: [] },
    });

    const request = new NextRequest('http://localhost/api/causemon/monitors/monitor123/test', {
      method: 'POST',
    });

    const response = await POST(request, { params: mockParams });
    expect(response.status).toBe(403);
  });

  it('should handle monitors with empty aliases and keywords arrays', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    // Monitor with empty arrays (as created by dynamic person/topic creation)
    const mockMonitor = {
      id: 'monitor123',
      userId: 'user123',
      publicFigureId: 'pf123',
      topicId: 'topic123',
      publicFigure: {
        id: 'pf123',
        name: 'Custom Person',
        aliases: [], // Empty array
      },
      topic: {
        id: 'topic123',
        name: 'Custom Topic',
        keywords: [], // Empty array
      },
    };

    (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(mockMonitor);

    // Mock Gemini response
    const mockModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('[]'), // Empty results
        },
      }),
    };

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    }));

    const request = new NextRequest('http://localhost/api/causemon/monitors/monitor123/test', {
      method: 'POST',
    });

    const response = await POST(request, { params: mockParams });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Test completed successfully');
    expect(data.eventsFound).toBe(0);
    
    // Verify the prompt was constructed without throwing errors
    const promptCall = mockModel.generateContent.mock.calls[0][0];
    expect(promptCall).toContain('Custom Person');
    expect(promptCall).toContain('Custom Topic');
    expect(promptCall).not.toContain('undefined');
  });

  it('should handle monitors with null aliases and keywords', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    // Monitor with null values (edge case)
    const mockMonitor = {
      id: 'monitor123',
      userId: 'user123',
      publicFigureId: 'pf123',
      topicId: 'topic123',
      publicFigure: {
        id: 'pf123',
        name: 'Another Person',
        aliases: null as any, // Null instead of array
      },
      topic: {
        id: 'topic123',
        name: 'Another Topic',
        keywords: null as any, // Null instead of array
      },
    };

    (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(mockMonitor);

    // Mock Gemini response
    const mockModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('[]'),
        },
      }),
    };

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    }));

    const request = new NextRequest('http://localhost/api/causemon/monitors/monitor123/test', {
      method: 'POST',
    });

    const response = await POST(request, { params: mockParams });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Test completed successfully');
  });

  it('should include aliases and keywords in prompt when present', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const mockMonitor = {
      id: 'monitor123',
      userId: 'user123',
      publicFigureId: 'pf123',
      topicId: 'topic123',
      publicFigure: {
        id: 'pf123',
        name: 'John Doe',
        aliases: ['JD', 'Johnny'], // Has aliases
      },
      topic: {
        id: 'topic123',
        name: 'Climate Change',
        keywords: ['global warming', 'environment'], // Has keywords
      },
    };

    (prisma.monitor.findUnique as jest.Mock).mockResolvedValue(mockMonitor);

    const mockModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('[]'),
        },
      }),
    };

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    }));

    const request = new NextRequest('http://localhost/api/causemon/monitors/monitor123/test', {
      method: 'POST',
    });

    const response = await POST(request, { params: mockParams });
    
    expect(response.status).toBe(200);
    
    // Verify aliases and keywords were included in the prompt
    const promptCall = mockModel.generateContent.mock.calls[0][0];
    expect(promptCall).toContain('(JD, Johnny)');
    expect(promptCall).toContain('(global warming, environment)');
  });

  it('should return 500 if Google API key not configured', async () => {
    delete process.env.GOOGLE_API_KEY;
    
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.monitor.findUnique as jest.Mock).mockResolvedValue({
      id: 'monitor123',
      userId: 'user123',
      publicFigure: { name: 'John Doe', aliases: [] },
      topic: { name: 'Climate', keywords: [] },
    });

    const request = new NextRequest('http://localhost/api/causemon/monitors/monitor123/test', {
      method: 'POST',
    });

    const response = await POST(request, { params: mockParams });
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Google API key not configured');
  });
});