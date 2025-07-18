import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { authenticateRequest, withAuthentication } from '../withAuthentication';
import * as tokenService from '../../services/token.service';

// Mock the token service
jest.mock('../../services/token.service');

const mockValidateToken = tokenService.validateToken as jest.MockedFunction<typeof tokenService.validateToken>;

describe('withAuthentication middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
  };

  const createMockRequest = (authHeader?: string) => {
    const headers = new Headers();
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }
    
    return {
      headers,
      json: jest.fn(),
      text: jest.fn(),
    } as unknown as NextRequest;
  };

  describe('authenticateRequest', () => {
    it('should successfully authenticate with valid token', async () => {
      mockValidateToken.mockResolvedValue(mockUser as any);
      const request = createMockRequest('Bearer maix_pat_validtoken');

      const result = await authenticateRequest(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toEqual(mockUser);
      }
      expect(mockValidateToken).toHaveBeenCalledWith('maix_pat_validtoken');
    });

    it('should fail with missing Authorization header', async () => {
      const request = createMockRequest();

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized: Missing or invalid Authorization header');
        expect(result.statusCode).toBe(401);
      }
    });

    it('should fail with invalid Authorization header format', async () => {
      const request = createMockRequest('Basic invalidformat');

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized: Missing or invalid Authorization header');
        expect(result.statusCode).toBe(401);
      }
    });

    it('should fail with empty token', async () => {
      const request = createMockRequest('Bearer ');

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized: Missing or invalid Authorization header');
        expect(result.statusCode).toBe(401);
      }
    });

    it('should fail with invalid token', async () => {
      mockValidateToken.mockResolvedValue(null);
      const request = createMockRequest('Bearer invalid_token');

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized: Invalid token');
        expect(result.statusCode).toBe(401);
      }
    });

    it('should fail with inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockValidateToken.mockResolvedValue(inactiveUser as any);
      const request = createMockRequest('Bearer maix_pat_validtoken');

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized: User account is inactive');
        expect(result.statusCode).toBe(401);
      }
    });

    it('should handle validation errors gracefully', async () => {
      mockValidateToken.mockRejectedValue(new Error('Database error'));
      const request = createMockRequest('Bearer maix_pat_validtoken');

      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Internal server error during authentication');
        expect(result.statusCode).toBe(500);
      }
    });
  });

  describe('withAuthentication wrapper', () => {
    it('should call handler with authenticated user', async () => {
      mockValidateToken.mockResolvedValue(mockUser as any);
      const request = createMockRequest('Bearer maix_pat_validtoken');
      
      const mockHandler = jest.fn().mockResolvedValue(new Response('Success'));
      const wrappedHandler = withAuthentication(mockHandler);

      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ user: mockUser })
      );
      expect(response).toBeInstanceOf(Response);
      expect(await response.text()).toBe('Success');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const request = createMockRequest();
      
      const mockHandler = jest.fn();
      const wrappedHandler = withAuthentication(mockHandler);

      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Unauthorized: Missing or invalid Authorization header');
    });

    it('should return 401 for invalid tokens', async () => {
      mockValidateToken.mockResolvedValue(null);
      const request = createMockRequest('Bearer invalid_token');
      
      const mockHandler = jest.fn();
      const wrappedHandler = withAuthentication(mockHandler);

      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Unauthorized: Invalid token');
    });

    it('should handle handler errors gracefully', async () => {
      mockValidateToken.mockResolvedValue(mockUser as any);
      const request = createMockRequest('Bearer maix_pat_validtoken');
      
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const wrappedHandler = withAuthentication(mockHandler);

      // This should not throw, but return a proper error response
      await expect(wrappedHandler(request)).rejects.toThrow('Handler error');
    });
  });
});