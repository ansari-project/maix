import { describe, it, expect, beforeEach } from '@jest/globals';
import { manageProjectTool } from '../manageProject';
import type { MaixMcpContext } from '../../types';

// Mock Prisma first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Import the mocked prisma
import { prisma } from '@/lib/prisma';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('manageProject tool', () => {
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

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    goal: 'Create an innovative AI solution for education',
    description: 'This is a comprehensive test project description that meets the minimum 50 character requirement for validation.',
    helpType: 'MVP',
    contactEmail: 'contact@example.com',
    targetCompletionDate: new Date('2024-12-31T23:59:59.000Z'),
    isActive: true,
    productId: null,
    ownerId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  describe('create action', () => {
    it('should create a project successfully', async () => {
      mockPrisma.project.create.mockResolvedValue(mockProject);

      const params = {
        action: 'create' as const,
        name: 'Test Project',
        goal: 'Create an innovative AI solution for education',
        description: 'This is a comprehensive test project description that meets the minimum 50 character requirement for validation.',
        helpType: 'MVP' as const,
        contactEmail: 'contact@example.com',
        targetCompletionDate: '2024-12-31T23:59:59.000Z',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
      expect(result.message).toBe('Project "Test Project" created successfully');
      
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          goal: 'Create an innovative AI solution for education',
          description: 'This is a comprehensive test project description that meets the minimum 50 character requirement for validation.',
          helpType: 'MVP',
          contactEmail: 'contact@example.com',
          targetCompletionDate: new Date('2024-12-31T23:59:59.000Z'),
          isActive: true,
          productId: undefined,
          ownerId: 'user-123',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should require name for creation', async () => {
      const params = {
        action: 'create' as const,
        goal: 'Create an innovative AI solution for education',
        description: 'This is a comprehensive test project description that meets the minimum 50 character requirement for validation.',
        helpType: 'MVP' as const,
        contactEmail: 'contact@example.com',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
      expect(mockPrisma.project.create).not.toHaveBeenCalled();
    });

    it('should require all mandatory fields', async () => {
      const params = {
        action: 'create' as const,
        name: 'Test Project',
        goal: 'Too short', // Too short - need at least 10 chars
        description: 'This is a comprehensive test project description that meets the minimum 50 character requirement for validation.', // Valid length
        helpType: 'MVP' as const,
        contactEmail: 'contact@example.com',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('update action', () => {
    it('should update a project successfully', async () => {
      mockPrisma.project.update.mockResolvedValue(mockProject);

      const params = {
        action: 'update' as const,
        projectId: 'project-123',
        name: 'Updated Project Name',
        goal: 'Updated goal for the project',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProject);
      expect(result.message).toBe('Project "Test Project" updated successfully');
      
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { 
          id: 'project-123',
          ownerId: 'user-123',
        },
        data: {
          name: 'Updated Project Name',
          goal: 'Updated goal for the project',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should require projectId for update', async () => {
      const params = {
        action: 'update' as const,
        name: 'Updated Name',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project ID is required for update, delete, and get actions');
    });

    it('should handle non-existent project', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';
      mockPrisma.project.update.mockRejectedValue(prismaError);

      const params = {
        action: 'update' as const,
        projectId: 'non-existent',
        name: 'Updated Name',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Project not found or you don't have permission to update it");
    });
  });

  describe('delete action', () => {
    it('should delete a project successfully', async () => {
      mockPrisma.project.delete.mockResolvedValue(mockProject);

      const params = {
        action: 'delete' as const,
        projectId: 'project-123',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Project deleted successfully');
      
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { 
          id: 'project-123',
          ownerId: 'user-123',
        },
      });
    });

    it('should require projectId for delete', async () => {
      const params = {
        action: 'delete' as const,
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project ID is required for update, delete, and get actions');
    });
  });

  describe('get action', () => {
    it('should get a project successfully', async () => {
      const projectWithApplications = {
        ...mockProject,
        applications: [
          {
            id: 'app-123',
            status: 'PENDING',
            appliedAt: new Date(),
            user: {
              id: 'volunteer-123',
              name: 'Volunteer',
              email: 'volunteer@example.com',
            },
          },
        ],
      };
      mockPrisma.project.findFirst.mockResolvedValue(projectWithApplications);

      const params = {
        action: 'get' as const,
        projectId: 'project-123',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(projectWithApplications);
      
      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: { 
          id: 'project-123',
          ownerId: 'user-123',
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          applications: {
            select: {
              id: true,
              appliedAt: true,
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });
    });

    it('should handle non-existent project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const params = {
        action: 'get' as const,
        projectId: 'non-existent',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Project not found or you don't have permission to access it");
    });
  });

  describe('list action', () => {
    it('should list user projects successfully', async () => {
      const projects = [mockProject, { ...mockProject, id: 'project-456', name: 'Another Project' }];
      mockPrisma.project.findMany.mockResolvedValue(projects);

      const params = {
        action: 'list' as const,
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(projects);
      expect(result.message).toBe('Found 2 projects');
      
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-123' },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          applications: {
            select: {
              id: true,
              appliedAt: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('validation', () => {
    it('should handle validation errors', async () => {
      const params = {
        action: 'create' as const,
        name: 'A', // Too short
        goal: 'Short', // Too short
        description: 'This is a comprehensive test project description that meets the minimum 50 character requirement for validation.', // Valid length
        helpType: 'INVALID' as any,
        contactEmail: 'invalid-email',
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should handle unknown actions', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const params = {
        action: 'unknown' as any,
      };

      const result = await manageProjectTool.handler(params, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
      
      consoleSpy.mockRestore();
    });
  });
});