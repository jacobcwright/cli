import type { HttpClient } from './http.js';
import type {
  User,
  ApiKeyResponse,
  ApiKeyInfo,
  ApiKeyListResponse,
  ApiKeyCreateResponse,
} from './types.js';

/**
 * API for authentication operations
 */
export class AuthAPI {
  constructor(private client: HttpClient) {}

  /**
   * Get the currently authenticated user
   * @returns The authenticated user
   * @throws AuthenticationError if not authenticated
   */
  async me(): Promise<User> {
    return this.client.request<User>('GET', '/auth/me');
  }

  /**
   * List all API keys for the authenticated user
   * @returns Array of API key info
   */
  async listApiKeys(): Promise<ApiKeyInfo[]> {
    const response = await this.client.request<ApiKeyListResponse>('GET', '/api-keys');
    return response.api_keys;
  }

  /**
   * Create a new named API key
   * @param name - Name for the API key (e.g., 'Production', 'Development')
   * @returns The new API key (full key only shown once)
   */
  async createApiKey(name?: string): Promise<ApiKeyCreateResponse> {
    return this.client.request<ApiKeyCreateResponse>('POST', '/api-keys', {
      body: { name: name ?? 'Default' },
    });
  }

  /**
   * Revoke an API key by ID
   * @param keyId - The API key ID to revoke
   */
  async revokeApiKey(keyId?: string): Promise<void> {
    if (keyId) {
      return this.client.request<void>('DELETE', `/api-keys/${encodeURIComponent(keyId)}`);
    }
    // Legacy fallback for single-key endpoint
    return this.client.request<void>('DELETE', '/auth/api-key');
  }
}
