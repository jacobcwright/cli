import type { HttpClient } from './http.js';
import type { User, ApiKeyResponse } from './types.js';

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
   * Create a new API key for the authenticated user
   * @returns The new API key (only shown once)
   * @throws BadRequestError if user already has an API key
   */
  async createApiKey(): Promise<ApiKeyResponse> {
    return this.client.request<ApiKeyResponse>('POST', '/auth/api-key');
  }

  /**
   * Revoke the user's API key
   * @throws BadRequestError if user has no API key
   */
  async revokeApiKey(): Promise<void> {
    return this.client.request<void>('DELETE', '/auth/api-key');
  }
}
