import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthAPI } from '../auth.js';
import type { HttpClient } from '../http.js';

function createMockClient() {
  const client = {
    request: vi.fn(),
    rawRequest: vi.fn(),
    requestMultipart: vi.fn(),
    setAuth: vi.fn(),
    setBaseUrl: vi.fn(),
    getBaseUrl: vi.fn(() => 'https://api.castari.com'),
  };
  return client;
}

describe('AuthAPI', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let auth: AuthAPI;

  beforeEach(() => {
    mockClient = createMockClient();
    auth = new AuthAPI(mockClient as unknown as HttpClient);
    vi.clearAllMocks();
  });

  describe('me()', () => {
    it('calls GET /auth/me', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        api_key_prefix: 'cast_abc',
        created_at: '2024-01-01T00:00:00Z',
      };
      mockClient.request.mockResolvedValue(mockUser);

      const result = await auth.me();

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('GET', '/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('returns user without optional api_key_prefix', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };
      mockClient.request.mockResolvedValue(mockUser);

      const result = await auth.me();

      expect(result).toEqual(mockUser);
      expect(result.api_key_prefix).toBeUndefined();
    });
  });

  describe('listApiKeys()', () => {
    it('calls GET /api-keys', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Production',
          prefix: 'cast_abc',
          created_at: '2024-01-01T00:00:00Z',
          last_used_at: '2024-06-01T00:00:00Z',
        },
        {
          id: 'key-2',
          name: 'Development',
          prefix: 'cast_def',
          created_at: '2024-02-01T00:00:00Z',
          last_used_at: null,
        },
      ];
      mockClient.request.mockResolvedValue({ api_keys: mockKeys });

      const result = await auth.listApiKeys();

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('GET', '/api-keys');
      expect(result).toEqual(mockKeys);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no keys exist', async () => {
      mockClient.request.mockResolvedValue({ api_keys: [] });

      const result = await auth.listApiKeys();

      expect(result).toEqual([]);
    });
  });

  describe('createApiKey()', () => {
    it('calls POST /api-keys with name in body', async () => {
      const mockResponse = {
        api_key: {
          id: 'key-1',
          name: 'Production',
          prefix: 'cast_abc',
          created_at: '2024-01-01T00:00:00Z',
          last_used_at: null,
        },
        key: 'cast_abc123full',
      };
      mockClient.request.mockResolvedValue(mockResponse);

      const result = await auth.createApiKey('Production');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('POST', '/api-keys', {
        body: { name: 'Production' },
      });
      expect(result).toEqual(mockResponse);
      expect(result.key).toBe('cast_abc123full');
    });

    it('uses "Default" as name when not provided', async () => {
      const mockResponse = {
        api_key: {
          id: 'key-1',
          name: 'Default',
          prefix: 'cast_abc',
          created_at: '2024-01-01T00:00:00Z',
          last_used_at: null,
        },
        key: 'cast_abc123full',
      };
      mockClient.request.mockResolvedValue(mockResponse);

      await auth.createApiKey();

      expect(mockClient.request).toHaveBeenCalledWith('POST', '/api-keys', {
        body: { name: 'Default' },
      });
    });
  });

  describe('revokeApiKey()', () => {
    it('calls DELETE /api-keys/{keyId} when keyId is provided', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await auth.revokeApiKey('key-123');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/api-keys/key-123');
    });

    it('encodes the keyId in the URL', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await auth.revokeApiKey('key with spaces');

      expect(mockClient.request).toHaveBeenCalledWith(
        'DELETE',
        '/api-keys/key%20with%20spaces'
      );
    });

    it('calls DELETE /auth/api-key (legacy) when no keyId is provided', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await auth.revokeApiKey();

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/auth/api-key');
    });

    it('calls legacy endpoint when keyId is undefined', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await auth.revokeApiKey(undefined);

      expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/auth/api-key');
    });
  });
});
