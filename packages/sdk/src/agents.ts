import type { HttpClient } from './http.js';
import type {
  Agent,
  AgentsListResponse,
  CreateAgentOptions,
  InvocationResponse,
  InvokeOptions,
  Secret,
} from './types.js';

/**
 * API for managing agents
 */
export class AgentsAPI {
  constructor(private client: HttpClient) {}

  /**
   * List all agents for the authenticated user
   * @returns Array of agents
   */
  async list(): Promise<Agent[]> {
    const response = await this.client.request<AgentsListResponse>('GET', '/agents');
    return response.agents;
  }

  /**
   * Create a new agent
   * @param options - Agent creation options
   * @returns The created agent
   */
  async create(options: CreateAgentOptions): Promise<Agent> {
    return this.client.request<Agent>('POST', '/agents', {
      body: {
        name: options.name,
        git_repo_url: options.gitRepoUrl,
        slug: options.slug,
      },
    });
  }

  /**
   * Get an agent by slug
   * @param slug - The agent's unique slug
   * @returns The agent
   * @throws NotFoundError if agent doesn't exist
   */
  async get(slug: string): Promise<Agent> {
    return this.client.request<Agent>('GET', `/agents/${encodeURIComponent(slug)}`);
  }

  /**
   * Delete an agent
   * @param slug - The agent's unique slug
   * @throws NotFoundError if agent doesn't exist
   */
  async delete(slug: string): Promise<void> {
    return this.client.request<void>('DELETE', `/agents/${encodeURIComponent(slug)}`);
  }

  /**
   * Deploy an agent (create sandbox, clone repo, install deps)
   * @param slug - The agent's unique slug
   * @returns The updated agent with status 'active'
   * @throws NotFoundError if agent doesn't exist
   */
  async deploy(slug: string): Promise<Agent> {
    return this.client.request<Agent>('POST', `/agents/${encodeURIComponent(slug)}/deploy`, {
      timeout: 120000, // 2 minutes for deployment
    });
  }

  /**
   * Stop a running agent
   * @param slug - The agent's unique slug
   * @returns The updated agent with status 'stopped'
   * @throws NotFoundError if agent doesn't exist
   */
  async stop(slug: string): Promise<Agent> {
    return this.client.request<Agent>('POST', `/agents/${encodeURIComponent(slug)}/stop`);
  }

  /**
   * Invoke an agent with a prompt
   * @param slug - The agent's unique slug
   * @param options - Invocation options including prompt
   * @returns The invocation response with result and usage stats
   * @throws NotFoundError if agent doesn't exist
   * @throws BadRequestError if agent is not deployed
   */
  async invoke(slug: string, options: InvokeOptions): Promise<InvocationResponse> {
    return this.client.request<InvocationResponse>(
      'POST',
      `/agents/${encodeURIComponent(slug)}/invoke`,
      {
        body: { prompt: options.prompt },
        timeout: 180000, // 3 minutes for invocation
      }
    );
  }

  /**
   * List secret keys for an agent (values are never returned)
   * @param slug - The agent's unique slug
   * @returns Array of secret key names
   */
  async listSecrets(slug: string): Promise<Secret[]> {
    const response = await this.client.request<{ secrets: Secret[] }>('GET', `/agents/${encodeURIComponent(slug)}/secrets`);
    return response.secrets;
  }

  /**
   * Set a secret for an agent
   * @param slug - The agent's unique slug
   * @param key - The secret key
   * @param value - The secret value
   */
  async setSecret(slug: string, key: string, value: string): Promise<void> {
    return this.client.request<void>('POST', `/agents/${encodeURIComponent(slug)}/secrets`, {
      body: { key, value },
    });
  }

  /**
   * Delete a secret from an agent
   * @param slug - The agent's unique slug
   * @param key - The secret key to delete
   */
  async deleteSecret(slug: string, key: string): Promise<void> {
    return this.client.request<void>(
      'DELETE',
      `/agents/${encodeURIComponent(slug)}/secrets/${encodeURIComponent(key)}`
    );
  }
}
