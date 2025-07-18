import { describe, it, expect, beforeEach } from '@jest/globals';
import { updateProfileTool } from '../updateProfile';
import type { MaixMcpContext } from '../../types';

// Mock Prisma first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

// Import the mocked prisma
import { prisma } from '@/lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('updateProfile tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContext: MaixMcpContext = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
    } as any,
  };

  const mockUpdatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Updated Name',
    bio: 'Updated bio',
    skills: ['JavaScript', 'TypeScript'],
    specialty: 'AI',
    experienceLevel: 'SENIOR',
    availability: '20 hours/week',
    linkedinUrl: 'https://linkedin.com/in/test',
    githubUrl: 'https://github.com/test',
    portfolioUrl: 'https://test.com',
    timezone: 'UTC',
    updatedAt: new Date(),
  };

  it('should update user profile successfully', async () => {
    mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

    const params = {
      name: 'Updated Name',
      bio: 'Updated bio',
      skills: ['JavaScript', 'TypeScript'],
      specialty: 'AI' as const,
      experienceLevel: 'SENIOR' as const,
      availability: '20 hours/week',
      linkedinUrl: 'https://linkedin.com/in/test',
      githubUrl: 'https://github.com/test',
      portfolioUrl: 'https://test.com',
      timezone: 'UTC',
    };

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUpdatedUser);
    expect(result.message).toBe('Profile updated successfully for test@example.com');
    
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: params,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        skills: true,
        specialty: true,
        experienceLevel: true,
        availability: true,
        linkedinUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        timezone: true,
        updatedAt: true,
      },
    });
  });

  it('should update only provided fields', async () => {
    mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

    const params = {
      name: 'Updated Name',
      bio: 'Updated bio',
    };

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        name: 'Updated Name',
        bio: 'Updated bio',
      },
      select: expect.any(Object),
    });
  });

  it('should handle validation errors', async () => {
    const params = {
      name: '', // Invalid: too short
      bio: 'A'.repeat(1001), // Invalid: too long
    };

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation error');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockPrisma.user.update.mockRejectedValue(new Error('Database error'));

    const params = {
      name: 'Updated Name',
    };

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe('An internal error occurred while updating the profile');
  });

  it('should validate skill array constraints', async () => {
    const params = {
      skills: Array(21).fill('skill'), // Invalid: too many skills
    };

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation error');
  });

  it('should validate enum values', async () => {
    const params = {
      specialty: 'INVALID_SPECIALTY' as any,
    };

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation error');
  });

  it('should validate URL formats', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const params = {
      linkedinUrl: 'not-a-url',
      githubUrl: 'also-not-a-url',
    };

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation error');
    
    consoleSpy.mockRestore();
  });

  it('should handle empty updates', async () => {
    mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

    const params = {}; // No fields to update

    const result = await updateProfileTool.handler(params, mockContext);

    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {},
      select: expect.any(Object),
    });
  });
});