import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../http.js';
import {
  CastariError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  BadRequestError,
  ServerError,
} from '../errors.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createJsonResponse(status: number, data: unknown, headers?: Record<string, string>) {
  const headersObj = new Headers({
    'content-type': 'application/json',
    ...headers,
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

function createNoContentResponse() {
  return {
    ok: true,
    status: 204,
    headers: new Headers(),
    json: vi.fn(),
    text: vi.fn(),
  };
}

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({
      baseUrl: 'https://api.castari.com',
      authType: 'api_key',
      authValue: 'cast_test123',
    });
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('returns data for successful JSON response', async () => {
      const responseData = { agents: [{ id: '1', name: 'Test' }] };
      mockFetch.mockResolvedValue(createJsonResponse(200, responseData));

      const result = await client.request('GET', '/agents');

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('sends correct URL with base URL and path', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('GET', '/agents');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://api.castari.com/api/v1/agents');
    });

    it('sends correct HTTP method', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('POST', '/agents', { body: { name: 'Test' } });

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.method).toBe('POST');
    });

    it('sends JSON body when provided', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      const body = { name: 'Test Agent', slug: 'test-agent' };
      await client.request('POST', '/agents', { body });

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.body).toBe(JSON.stringify(body));
    });

    it('does not send body for GET requests without body', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('GET', '/agents');

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.body).toBeUndefined();
    });

    it('appends query parameters to URL', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('GET', '/agents', {
        query: { status: 'active', limit: 10 },
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('status=active');
      expect(calledUrl).toContain('limit=10');
    });

    it('skips undefined query parameters', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('GET', '/agents', {
        query: { status: 'active', limit: undefined },
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('status=active');
      expect(calledUrl).not.toContain('limit');
    });

    it('sends Content-Type and Accept headers', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('GET', '/agents');

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.headers['Content-Type']).toBe('application/json');
      expect(calledOptions.headers['Accept']).toBe('application/json');
    });
  });

  describe('204 No Content', () => {
    it('handles 204 No Content responses', async () => {
      mockFetch.mockResolvedValue(createNoContentResponse());

      const result = await client.request('DELETE', '/agents/test');

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationError for 401', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(401, { detail: 'Invalid API key' })
      );

      await expect(client.request('GET', '/agents')).rejects.toThrow(AuthenticationError);
      await expect(client.request('GET', '/agents')).rejects.toThrow('Invalid API key');
    });

    it('throws NotFoundError for 404', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(404, { detail: 'Agent not found' })
      );

      await expect(client.request('GET', '/agents/missing')).rejects.toThrow(NotFoundError);
      await expect(client.request('GET', '/agents/missing')).rejects.toThrow('Agent not found');
    });

    it('throws ValidationError for 422', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(422, { detail: 'Invalid slug format' })
      );

      await expect(client.request('POST', '/agents', { body: {} })).rejects.toThrow(
        ValidationError
      );
      await expect(client.request('POST', '/agents', { body: {} })).rejects.toThrow(
        'Invalid slug format'
      );
    });

    it('throws RateLimitError for 429 with retryAfter', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(429, { detail: 'Rate limit exceeded' }, { 'Retry-After': '30' })
      );

      try {
        await client.request('GET', '/agents');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).message).toBe('Rate limit exceeded');
        expect((error as RateLimitError).retryAfter).toBe(30);
      }
    });

    it('throws RateLimitError for 429 without retryAfter', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(429, { detail: 'Too many requests' })
      );

      try {
        await client.request('GET', '/agents');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBeUndefined();
      }
    });

    it('throws BadRequestError for 400', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(400, { detail: 'Missing required field' })
      );

      await expect(client.request('POST', '/agents', { body: {} })).rejects.toThrow(
        BadRequestError
      );
      await expect(client.request('POST', '/agents', { body: {} })).rejects.toThrow(
        'Missing required field'
      );
    });

    it('throws ServerError for 500', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(500, { detail: 'Internal server error' })
      );

      await expect(client.request('GET', '/agents')).rejects.toThrow(ServerError);
      await expect(client.request('GET', '/agents')).rejects.toThrow('Internal server error');
    });

    it('throws ServerError for 502', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(502, { detail: 'Bad gateway' })
      );

      await expect(client.request('GET', '/agents')).rejects.toThrow(ServerError);
    });

    it('throws ServerError for 503', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(503, { detail: 'Service unavailable' })
      );

      await expect(client.request('GET', '/agents')).rejects.toThrow(ServerError);
    });

    it('throws CastariError for other status codes', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(418, { detail: 'I am a teapot' })
      );

      await expect(client.request('GET', '/agents')).rejects.toThrow(CastariError);
      await expect(client.request('GET', '/agents')).rejects.toThrow('I am a teapot');
    });

    it('uses fallback message when detail is not present', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(500, {})
      );

      await expect(client.request('GET', '/agents')).rejects.toThrow('An error occurred');
    });
  });

  describe('timeout handling', () => {
    it('throws CastariError on timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(client.request('GET', '/agents')).rejects.toThrow(CastariError);
      await expect(client.request('GET', '/agents')).rejects.toThrow('Request timed out');
    });

    it('throws CastariError for generic fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      await expect(client.request('GET', '/agents')).rejects.toThrow(CastariError);
      await expect(client.request('GET', '/agents')).rejects.toThrow(
        'Request failed: Network failure'
      );
    });

    it('throws CastariError for non-Error exceptions', async () => {
      mockFetch.mockRejectedValue('unexpected string error');

      await expect(client.request('GET', '/agents')).rejects.toThrow(CastariError);
      await expect(client.request('GET', '/agents')).rejects.toThrow(
        'An unexpected error occurred'
      );
    });

    it('passes custom timeout to AbortController', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('GET', '/agents', { timeout: 5000 });

      // Verify the signal was passed to fetch
      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('authentication', () => {
    it('sets Bearer auth header when authValue is configured', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await client.request('GET', '/agents');

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.headers['Authorization']).toBe('Bearer cast_test123');
    });

    it('does not set auth header when no authValue is configured', async () => {
      const unauthClient = new HttpClient({ baseUrl: 'https://api.castari.com' });
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await unauthClient.request('GET', '/agents');

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.headers['Authorization']).toBeUndefined();
    });

    it('updates auth header after setAuth() is called', async () => {
      const freshClient = new HttpClient({ baseUrl: 'https://api.castari.com' });
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      // First request without auth
      await freshClient.request('GET', '/agents');
      expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBeUndefined();

      // Set auth
      freshClient.setAuth('api_key', 'cast_new_key');

      // Second request should use new auth
      await freshClient.request('GET', '/agents');
      expect(mockFetch.mock.calls[1][1].headers['Authorization']).toBe('Bearer cast_new_key');
    });

    it('uses Bearer format for both api_key and token auth types', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      // Token auth
      const tokenClient = new HttpClient({
        baseUrl: 'https://api.castari.com',
        authType: 'token',
        authValue: 'oauth-token-123',
      });
      await tokenClient.request('GET', '/agents');
      expect(mockFetch.mock.calls[0][1].headers['Authorization']).toBe(
        'Bearer oauth-token-123'
      );
    });
  });

  describe('setBaseUrl()', () => {
    it('changes the base URL for subsequent requests', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      client.setBaseUrl('https://custom.api.com');
      await client.request('GET', '/agents');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://custom.api.com/api/v1/agents');
    });

    it('strips trailing slash from base URL', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      client.setBaseUrl('https://custom.api.com/');
      await client.request('GET', '/agents');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://custom.api.com/api/v1/agents');
    });
  });

  describe('getBaseUrl()', () => {
    it('returns the current base URL', () => {
      expect(client.getBaseUrl()).toBe('https://api.castari.com');
    });

    it('returns updated URL after setBaseUrl()', () => {
      client.setBaseUrl('https://new.api.com');
      expect(client.getBaseUrl()).toBe('https://new.api.com');
    });
  });

  describe('rawRequest()', () => {
    it('returns the raw Response object', async () => {
      const rawResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
      };
      mockFetch.mockResolvedValue(rawResponse);

      const result = await client.rawRequest('GET', '/agents/test/download');

      expect(result).toBe(rawResponse);
    });

    it('does not set Content-Type header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
      });

      await client.rawRequest('GET', '/agents/test/download');

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.headers['Content-Type']).toBeUndefined();
    });

    it('throws errors for non-ok responses', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse(404, { detail: 'Not found' })
      );

      await expect(client.rawRequest('GET', '/agents/missing')).rejects.toThrow(NotFoundError);
    });

    it('throws CastariError on AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(client.rawRequest('GET', '/test')).rejects.toThrow('Request timed out');
    });
  });

  describe('requestMultipart()', () => {
    it('sends FormData body', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, { file_id: 'f-1' }));

      const formData = new FormData();
      formData.append('file', new Blob(['hello']), 'test.txt');

      const result = await client.requestMultipart('POST', '/upload', formData);

      expect(result).toEqual({ file_id: 'f-1' });
      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.body).toBe(formData);
    });

    it('does not set Content-Type header (lets fetch handle it for FormData)', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      const formData = new FormData();
      await client.requestMultipart('POST', '/upload', formData);

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.headers['Content-Type']).toBeUndefined();
    });

    it('sets Accept header to application/json', async () => {
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      const formData = new FormData();
      await client.requestMultipart('POST', '/upload', formData);

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.headers['Accept']).toBe('application/json');
    });

    it('handles 204 No Content for multipart requests', async () => {
      mockFetch.mockResolvedValue(createNoContentResponse());

      const formData = new FormData();
      const result = await client.requestMultipart('POST', '/upload', formData);

      expect(result).toBeUndefined();
    });

    it('throws CastariError with "Upload timed out" on AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const formData = new FormData();
      await expect(
        client.requestMultipart('POST', '/upload', formData)
      ).rejects.toThrow('Upload timed out');
    });

    it('throws CastariError with "Upload failed" on generic error', async () => {
      mockFetch.mockRejectedValue(new Error('Connection reset'));

      const formData = new FormData();
      await expect(
        client.requestMultipart('POST', '/upload', formData)
      ).rejects.toThrow('Upload failed: Connection reset');
    });
  });

  describe('constructor', () => {
    it('strips trailing slash from base URL', () => {
      const c = new HttpClient({ baseUrl: 'https://api.castari.com/' });
      expect(c.getBaseUrl()).toBe('https://api.castari.com');
    });

    it('works without auth options', async () => {
      const c = new HttpClient({ baseUrl: 'https://api.castari.com' });
      mockFetch.mockResolvedValue(createJsonResponse(200, {}));

      await c.request('GET', '/test');

      const calledOptions = mockFetch.mock.calls[0][1];
      expect(calledOptions.headers['Authorization']).toBeUndefined();
    });
  });
});
