import type { HttpClient } from './http.js';
import type {
  Agent,
  AgentsListResponse,
  CreateAgentOptions,
  UpdateAgentOptions,
  InvocationResponse,
  InvokeOptions,
  Secret,
  UploadResponse,
  SessionListResponse,
  Session,
  InvocationListResponse,
  InvocationHistoryItem,
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
    const body: Record<string, unknown> = {
      name: options.name,
      source_type: options.sourceType ?? 'git',
    };

    if (options.slug) {
      body.slug = options.slug;
    }
    if (options.description) {
      body.description = options.description;
    }
    if (options.gitRepoUrl) {
      body.git_repo_url = options.gitRepoUrl;
    }

    return this.client.request<Agent>('POST', '/agents', { body });
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
   * Update an agent's configuration
   * @param slug - The agent's unique slug
   * @param options - Fields to update
   * @returns The updated agent
   * @throws NotFoundError if agent doesn't exist
   */
  async update(slug: string, options: UpdateAgentOptions): Promise<Agent> {
    const body: Record<string, unknown> = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.description !== undefined) body.description = options.description;
    if (options.gitRepoUrl !== undefined) body.git_repo_url = options.gitRepoUrl;
    if (options.gitBranch !== undefined) body.git_branch = options.gitBranch;
    if (options.defaultModel !== undefined) body.default_model = options.defaultModel;
    if (options.maxTurns !== undefined) body.max_turns = options.maxTurns;
    if (options.timeoutSeconds !== undefined) body.timeout_seconds = options.timeoutSeconds;

    return this.client.request<Agent>('PATCH', `/agents/${encodeURIComponent(slug)}`, { body });
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
   * Upload code directly to an agent and deploy
   * @param slug - The agent's unique slug
   * @param file - The code archive file (Blob or File)
   * @param filename - The filename (e.g., 'code.tar.gz')
   * @param options - Upload options
   * @returns The upload response with deployment status
   * @throws NotFoundError if agent doesn't exist
   */
  async uploadCode(
    slug: string,
    file: Blob,
    filename: string,
    options?: { autoDeploy?: boolean }
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file, filename);

    return this.client.requestMultipart<UploadResponse>(
      'POST',
      `/agents/${encodeURIComponent(slug)}/upload-code`,
      formData,
      {
        query: { auto_deploy: options?.autoDeploy ?? true },
        timeout: 300000, // 5 minutes for upload + deploy
      }
    );
  }

  /**
   * Stop a running agent by destroying its sandbox
   * @param slug - The agent's unique slug
   * @throws NotFoundError if agent doesn't exist
   */
  async stop(slug: string): Promise<void> {
    return this.client.request<void>('DELETE', `/${encodeURIComponent(slug)}/sandbox`);
  }

  /**
   * Invoke an agent with a prompt
   * @param slug - The agent's unique slug
   * @param options - Invocation options including prompt and optional session ID
   * @returns The invocation response with result and usage stats
   * @throws NotFoundError if agent doesn't exist
   * @throws BadRequestError if agent is not deployed
   */
  async invoke(slug: string, options: InvokeOptions): Promise<InvocationResponse> {
    return this.client.request<InvocationResponse>(
      'POST',
      `/agents/${encodeURIComponent(slug)}/invoke`,
      {
        body: {
          prompt: options.prompt,
          ...(options.sessionId && { session_id: options.sessionId }),
        },
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

  /**
   * Redeploy an agent (rebuild sandbox from latest code)
   * @param slug - The agent's unique slug
   * @returns The updated agent
   * @throws NotFoundError if agent doesn't exist
   */
  async redeploy(slug: string): Promise<Agent> {
    return this.client.request<Agent>('POST', `/agents/${encodeURIComponent(slug)}/redeploy`, {
      timeout: 120000,
    });
  }

  /**
   * List sessions for an agent
   * @param slug - The agent's unique slug
   * @returns Array of sessions
   */
  async listSessions(slug: string): Promise<Session[]> {
    const response = await this.client.request<SessionListResponse>(
      'GET',
      `/agents/${encodeURIComponent(slug)}/sessions`
    );
    return response.sessions;
  }

  /**
   * Delete a session
   * @param slug - The agent's unique slug
   * @param sessionId - The session ID to delete
   */
  async deleteSession(slug: string, sessionId: string): Promise<void> {
    return this.client.request<void>(
      'DELETE',
      `/agents/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}`
    );
  }

  /**
   * List invocation history for an agent
   * @param slug - The agent's unique slug
   * @param options - Optional filter options
   * @returns Array of invocation history items
   */
  async listInvocations(
    slug: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<InvocationHistoryItem[]> {
    const query: Record<string, string | number | undefined> = {};
    if (options?.status) query.status = options.status;
    if (options?.limit) query.limit = options.limit;
    if (options?.offset) query.offset = options.offset;

    const response = await this.client.request<InvocationListResponse>(
      'GET',
      `/agents/${encodeURIComponent(slug)}/invocations`,
      { query }
    );
    return response.invocations;
  }
}
