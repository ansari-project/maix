import { describe, it, expect, beforeEach } from '@jest/globals';
import { validateToken } from '../token.service';
import * as patService from '../pat.service';

// Mock the PAT service
jest.mock('../pat.service');

const mockValidatePersonalAccessToken = patService.validatePersonalAccessToken as jest.MockedFunction<typeof patService.validatePersonalAccessToken>;

describe('Token Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
    };

    it('should validate PAT tokens', async () => {
      mockValidatePersonalAccessToken.mockResolvedValue(mockUser as any);

      const result = await validateToken('maix_pat_abc123');
      
      expect(result).toEqual(mockUser);
      expect(mockValidatePersonalAccessToken).toHaveBeenCalledWith('maix_pat_abc123');
    });

    it('should return null for invalid PAT tokens', async () => {
      mockValidatePersonalAccessToken.mockResolvedValue(null);

      const result = await validateToken('maix_pat_invalid');
      
      expect(result).toBeNull();
      expect(mockValidatePersonalAccessToken).toHaveBeenCalledWith('maix_pat_invalid');
    });

    it('should return null for unknown token formats', async () => {
      const result = await validateToken('unknown_token_format');
      
      expect(result).toBeNull();
      expect(mockValidatePersonalAccessToken).not.toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      mockValidatePersonalAccessToken.mockRejectedValue(new Error('Validation error'));

      const result = await validateToken('maix_pat_error');
      
      expect(result).toBeNull();
    });

    it('should handle JWT tokens in the future', async () => {
      // This test documents the future JWT support
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const result = await validateToken(jwtToken);
      
      // Currently returns null, but will be implemented for OAuth support
      expect(result).toBeNull();
    });
  });
});