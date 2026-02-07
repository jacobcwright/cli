import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentsAPI } from '../agents.js';
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

describe('AgentsAPI', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let agents: AgentsAPI;

  beforeEach(() => {
    mockClient = createMockClient();
    agents = new AgentsAPI(mockClient as unknown as HttpClient);
    vi.clearAllMocks();
  });

  describe('list()', () => {
    it('calls GET /agents and returns agents array', async () => {
      const mockAgents = [
        { id: '1', name: 'Agent One', slug: 'agent-one', status: 'active' },
        { id: '2', name: 'Agent Two', slug: 'agent-two', status: 'draft' },
      ];
      mockClient.request.mockResolvedValue({ agents: mockAgents });

      const result = await agents.list();

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('GET', '/agents');
      expect(result).toEqual(mockAgents);
    });

    it('returns empty array when no agents exist', async () => {
      mockClient.request.mockResolvedValue({ agents: [] });

      const result = await agents.list();

      expect(result).toEqual([]);
    });
  });

  describe('create()', () => {
    it('calls POST /agents with correct body', async () => {
      const mockAgent = { id: '1', name: 'New Agent', slug: 'new-agent', status: 'draft' };
      mockClient.request.mockResolvedValue(mockAgent);

      const result = await agents.create({ name: 'New Agent' });

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('POST', '/agents', {
        body: {
          name: 'New Agent',
          source_type: 'git',
        },
      });
      expect(result).toEqual(mockAgent);
    });

    it('includes optional fields in the body', async () => {
      const mockAgent = { id: '1', name: 'My Agent', slug: 'my-agent', status: 'draft' };
      mockClient.request.mockResolvedValue(mockAgent);

      await agents.create({
        name: 'My Agent',
        slug: 'my-agent',
        description: 'A test agent',
        sourceType: 'local',
        gitRepoUrl: 'https://github.com/user/repo',
      });

      expect(mockClient.request).toHaveBeenCalledWith('POST', '/agents', {
        body: {
          name: 'My Agent',
          slug: 'my-agent',
          description: 'A test agent',
          source_type: 'local',
          git_repo_url: 'https://github.com/user/repo',
        },
      });
    });
  });

  describe('get()', () => {
    it('calls GET /agents/{slug}', async () => {
      const mockAgent = { id: '1', name: 'Test Agent', slug: 'test-agent', status: 'active' };
      mockClient.request.mockResolvedValue(mockAgent);

      const result = await agents.get('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('GET', '/agents/test-agent');
      expect(result).toEqual(mockAgent);
    });

    it('encodes the slug in the URL', async () => {
      mockClient.request.mockResolvedValue({});

      await agents.get('my agent');

      expect(mockClient.request).toHaveBeenCalledWith('GET', '/agents/my%20agent');
    });
  });

  describe('update()', () => {
    it('calls PATCH /agents/{slug} with correct body', async () => {
      const mockAgent = { id: '1', name: 'Updated Agent', slug: 'test-agent', status: 'active' };
      mockClient.request.mockResolvedValue(mockAgent);

      const result = await agents.update('test-agent', { name: 'Updated Agent' });

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('PATCH', '/agents/test-agent', {
        body: { name: 'Updated Agent' },
      });
      expect(result).toEqual(mockAgent);
    });

    it('maps camelCase options to snake_case body fields', async () => {
      mockClient.request.mockResolvedValue({});

      await agents.update('test-agent', {
        name: 'New Name',
        description: 'New desc',
        gitRepoUrl: 'https://github.com/user/repo',
        gitBranch: 'develop',
        defaultModel: 'claude-3-opus',
        maxTurns: 10,
        timeoutSeconds: 300,
      });

      expect(mockClient.request).toHaveBeenCalledWith('PATCH', '/agents/test-agent', {
        body: {
          name: 'New Name',
          description: 'New desc',
          git_repo_url: 'https://github.com/user/repo',
          git_branch: 'develop',
          default_model: 'claude-3-opus',
          max_turns: 10,
          timeout_seconds: 300,
        },
      });
    });

    it('only includes defined fields in the body', async () => {
      mockClient.request.mockResolvedValue({});

      await agents.update('test-agent', { description: 'Only this field' });

      expect(mockClient.request).toHaveBeenCalledWith('PATCH', '/agents/test-agent', {
        body: { description: 'Only this field' },
      });
    });
  });

  describe('delete()', () => {
    it('calls DELETE /agents/{slug}', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.delete('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/agents/test-agent');
    });
  });

  describe('deploy()', () => {
    it('calls POST /agents/{slug}/deploy with 120s timeout', async () => {
      const mockAgent = { id: '1', slug: 'test-agent', status: 'active' };
      mockClient.request.mockResolvedValue(mockAgent);

      const result = await agents.deploy('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('POST', '/agents/test-agent/deploy', {
        timeout: 120000,
      });
      expect(result).toEqual(mockAgent);
    });
  });

  describe('stop()', () => {
    it('calls DELETE /{slug}/sandbox', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.stop('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/test-agent/sandbox');
    });

    it('encodes the slug in the URL', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.stop('my agent');

      expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/my%20agent/sandbox');
    });
  });

  describe('invoke()', () => {
    it('calls POST /agents/{slug}/invoke with prompt', async () => {
      const mockResponse = {
        invocation_id: 'inv-1',
        session_id: 'sess-1',
        response_content: 'Hello!',
        input_tokens: 10,
        output_tokens: 5,
        total_cost_usd: '0.001',
        duration_ms: 1500,
        status: 'completed',
      };
      mockClient.request.mockResolvedValue(mockResponse);

      const result = await agents.invoke('test-agent', { prompt: 'Hello!' });

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('POST', '/agents/test-agent/invoke', {
        body: { prompt: 'Hello!' },
        timeout: 180000,
      });
      expect(result).toEqual(mockResponse);
    });

    it('includes sessionId when provided', async () => {
      mockClient.request.mockResolvedValue({});

      await agents.invoke('test-agent', {
        prompt: 'Hello!',
        sessionId: 'sess-custom',
      });

      expect(mockClient.request).toHaveBeenCalledWith('POST', '/agents/test-agent/invoke', {
        body: { prompt: 'Hello!', session_id: 'sess-custom' },
        timeout: 180000,
      });
    });
  });

  describe('redeploy()', () => {
    it('calls POST /agents/{slug}/redeploy', async () => {
      const mockAgent = { id: '1', slug: 'test-agent', status: 'active' };
      mockClient.request.mockResolvedValue(mockAgent);

      const result = await agents.redeploy('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('POST', '/agents/test-agent/redeploy', {
        timeout: 120000,
      });
      expect(result).toEqual(mockAgent);
    });
  });

  describe('listSessions()', () => {
    it('calls GET /agents/{slug}/sessions', async () => {
      const mockSessions = [
        { id: 'sess-1', agent_id: 'agent-1', sandbox_id: null, created_at: '2024-01-01' },
        { id: 'sess-2', agent_id: 'agent-1', sandbox_id: 'sb-1', created_at: '2024-01-02' },
      ];
      mockClient.request.mockResolvedValue({ sessions: mockSessions });

      const result = await agents.listSessions('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('GET', '/agents/test-agent/sessions');
      expect(result).toEqual(mockSessions);
    });

    it('returns empty array when no sessions exist', async () => {
      mockClient.request.mockResolvedValue({ sessions: [] });

      const result = await agents.listSessions('test-agent');

      expect(result).toEqual([]);
    });
  });

  describe('deleteSession()', () => {
    it('calls DELETE /agents/{slug}/sessions/{sessionId}', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.deleteSession('test-agent', 'sess-123');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith(
        'DELETE',
        '/agents/test-agent/sessions/sess-123'
      );
    });

    it('encodes the sessionId in the URL', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.deleteSession('test-agent', 'sess id');

      expect(mockClient.request).toHaveBeenCalledWith(
        'DELETE',
        '/agents/test-agent/sessions/sess%20id'
      );
    });
  });

  describe('listInvocations()', () => {
    it('calls GET /agents/{slug}/invocations', async () => {
      const mockInvocations = [
        {
          id: 'inv-1',
          agent_id: 'agent-1',
          session_id: 'sess-1',
          prompt: 'Hello',
          response_content: 'Hi!',
          input_tokens: 10,
          output_tokens: 5,
          total_cost_usd: '0.001',
          duration_ms: 1000,
          status: 'completed',
          created_at: '2024-01-01',
        },
      ];
      mockClient.request.mockResolvedValue({ invocations: mockInvocations });

      const result = await agents.listInvocations('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('GET', '/agents/test-agent/invocations', {
        query: {},
      });
      expect(result).toEqual(mockInvocations);
    });

    it('passes filter options as query parameters', async () => {
      mockClient.request.mockResolvedValue({ invocations: [] });

      await agents.listInvocations('test-agent', {
        status: 'completed',
        limit: 10,
        offset: 20,
      });

      expect(mockClient.request).toHaveBeenCalledWith('GET', '/agents/test-agent/invocations', {
        query: { status: 'completed', limit: 10, offset: 20 },
      });
    });
  });

  describe('listSecrets()', () => {
    it('calls GET /agents/{slug}/secrets', async () => {
      const mockSecrets = [{ key: 'API_KEY' }, { key: 'DB_PASSWORD' }];
      mockClient.request.mockResolvedValue({ secrets: mockSecrets });

      const result = await agents.listSecrets('test-agent');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('GET', '/agents/test-agent/secrets');
      expect(result).toEqual(mockSecrets);
    });

    it('returns empty array when no secrets exist', async () => {
      mockClient.request.mockResolvedValue({ secrets: [] });

      const result = await agents.listSecrets('test-agent');

      expect(result).toEqual([]);
    });
  });

  describe('setSecret()', () => {
    it('calls POST /agents/{slug}/secrets with key and value', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.setSecret('test-agent', 'API_KEY', 'sk-123456');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith('POST', '/agents/test-agent/secrets', {
        body: { key: 'API_KEY', value: 'sk-123456' },
      });
    });
  });

  describe('deleteSecret()', () => {
    it('calls DELETE /agents/{slug}/secrets/{key}', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.deleteSecret('test-agent', 'API_KEY');

      expect(mockClient.request).toHaveBeenCalledOnce();
      expect(mockClient.request).toHaveBeenCalledWith(
        'DELETE',
        '/agents/test-agent/secrets/API_KEY'
      );
    });

    it('encodes the key in the URL', async () => {
      mockClient.request.mockResolvedValue(undefined);

      await agents.deleteSecret('test-agent', 'MY KEY');

      expect(mockClient.request).toHaveBeenCalledWith(
        'DELETE',
        '/agents/test-agent/secrets/MY%20KEY'
      );
    });
  });
});
