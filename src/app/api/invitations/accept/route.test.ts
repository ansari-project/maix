import { NextRequest } from 'next/server';
import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { validateInvitationToken } from '@/lib/invitation-utils';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/invitation-utils');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    organizationMember: {
      findUnique: jest.fn(),
    },
    productMember: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.Mock;
const mockValidateInvitationToken = validateInvitationToken as jest.Mock;

describe('POST /api/invitations/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hierarchical invitation acceptance', () => {
    it('should create parent memberships when accepting a project invitation', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'user@example.com' },
      });

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          id: 'inv123',
          email: 'user@example.com',
          role: 'MEMBER',
          projectId: 'project123',
          project: {
            id: 'project123',
            name: 'Test Project',
            productId: 'product123',
            organizationId: 'org123',
          },
        },
      });

      // Mock existing membership checks
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock transaction to track operations
      const transactionOps: any[] = [];
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const txMock = {
          invitation: {
            update: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'invitation.update', args });
              return Promise.resolve({ id: 'inv123' });
            }),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'project123',
              productId: 'product123',
              organizationId: 'org123',
              product: { organizationId: 'org123' },
            }),
          },
          projectMember: {
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'projectMember.create', args });
              return Promise.resolve({ id: 'pm123', ...args.data });
            }),
          },
          productMember: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'productMember.create', args });
              return Promise.resolve({ id: 'prodm123', ...args.data });
            }),
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'organizationMember.create', args });
              return Promise.resolve({ id: 'orgm123', ...args.data });
            }),
          },
        };
        
        const result = await fn(txMock);
        return result;
      });

      // Make request
      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('You have successfully joined Test Project');
      expect(data.message).toContain('You have also been granted access to the parent product and organization');

      // Verify all memberships were created
      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'projectMember.create',
          args: expect.objectContaining({
            data: expect.objectContaining({
              projectId: 'project123',
              userId: 'user123',
              role: 'MEMBER',
            }),
          }),
        })
      );

      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'productMember.create',
          args: expect.objectContaining({
            data: expect.objectContaining({
              productId: 'product123',
              userId: 'user123',
              role: 'VIEWER',
            }),
          }),
        })
      );

      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'organizationMember.create',
          args: expect.objectContaining({
            data: expect.objectContaining({
              organizationId: 'org123',
              userId: 'user123',
              role: 'MEMBER',
            }),
          }),
        })
      );
    });

    it('should create only organization membership when accepting a product invitation', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'user@example.com' },
      });

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          id: 'inv123',
          email: 'user@example.com',
          role: 'ADMIN',
          productId: 'product123',
          product: {
            id: 'product123',
            name: 'Test Product',
            organizationId: 'org123',
          },
        },
      });

      // Mock existing membership checks
      (prisma.productMember.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock transaction
      const transactionOps: any[] = [];
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const txMock = {
          invitation: {
            update: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'invitation.update', args });
              return Promise.resolve({ id: 'inv123' });
            }),
          },
          product: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'product123',
              organizationId: 'org123',
            }),
          },
          productMember: {
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'productMember.create', args });
              return Promise.resolve({ id: 'prodm123', ...args.data });
            }),
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'organizationMember.create', args });
              return Promise.resolve({ id: 'orgm123', ...args.data });
            }),
          },
        };
        
        const result = await fn(txMock);
        return result;
      });

      // Make request
      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('You have successfully joined Test Product');
      expect(data.message).toContain('You have also been granted access to the parent organization');

      // Verify memberships
      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'productMember.create',
          args: expect.objectContaining({
            data: expect.objectContaining({
              productId: 'product123',
              userId: 'user123',
              role: 'ADMIN',
            }),
          }),
        })
      );

      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'organizationMember.create',
          args: expect.objectContaining({
            data: expect.objectContaining({
              organizationId: 'org123',
              userId: 'user123',
              role: 'MEMBER',
            }),
          }),
        })
      );
    });

    it('should not create duplicate parent memberships', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'user@example.com' },
      });

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          id: 'inv123',
          email: 'user@example.com',
          role: 'MEMBER',
          projectId: 'project123',
          project: {
            id: 'project123',
            name: 'Test Project',
            productId: 'product123',
            organizationId: 'org123',
          },
        },
      });

      // Mock existing membership checks
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock transaction - user already has org membership
      const transactionOps: any[] = [];
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const txMock = {
          invitation: {
            update: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'invitation.update', args });
              return Promise.resolve({ id: 'inv123' });
            }),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'project123',
              productId: 'product123',
              organizationId: 'org123',
              product: { organizationId: 'org123' },
            }),
          },
          projectMember: {
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'projectMember.create', args });
              return Promise.resolve({ id: 'pm123', ...args.data });
            }),
          },
          productMember: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'productMember.create', args });
              return Promise.resolve({ id: 'prodm123', ...args.data });
            }),
          },
          organizationMember: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'existing-org-member',
              organizationId: 'org123',
              userId: 'user123',
              role: 'OWNER',
            }),
            create: jest.fn(),
          },
        };
        
        const result = await fn(txMock);
        return result;
      });

      // Make request
      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify organization membership was NOT created (already exists)
      expect(transactionOps).not.toContainEqual(
        expect.objectContaining({
          type: 'organizationMember.create',
        })
      );

      // But product and project memberships were created
      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'projectMember.create',
        })
      );
      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'productMember.create',
        })
      );
    });

    it('should create no parent memberships for organization invitations', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'user@example.com' },
      });

      // Mock invitation validation
      mockValidateInvitationToken.mockResolvedValue({
        valid: true,
        invitation: {
          id: 'inv123',
          email: 'user@example.com',
          role: 'OWNER',
          organizationId: 'org123',
          organization: {
            id: 'org123',
            name: 'Test Organization',
          },
        },
      });

      // Mock existing membership checks
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock transaction
      const transactionOps: any[] = [];
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const txMock = {
          invitation: {
            update: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'invitation.update', args });
              return Promise.resolve({ id: 'inv123' });
            }),
          },
          organizationMember: {
            create: jest.fn().mockImplementation((args) => {
              transactionOps.push({ type: 'organizationMember.create', args });
              return Promise.resolve({ id: 'orgm123', ...args.data });
            }),
          },
        };
        
        const result = await fn(txMock);
        return result;
      });

      // Make request
      const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('You have successfully joined Test Organization as a owner.');
      expect(data.message).not.toContain('parent'); // No parent memberships message

      // Verify only organization membership was created
      expect(transactionOps).toHaveLength(2); // invitation update + org member create
      expect(transactionOps).toContainEqual(
        expect.objectContaining({
          type: 'organizationMember.create',
          args: expect.objectContaining({
            data: expect.objectContaining({
              organizationId: 'org123',
              userId: 'user123',
              role: 'OWNER',
            }),
          }),
        })
      );
    });
  });
});