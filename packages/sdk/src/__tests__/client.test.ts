import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CastariClient } from '../client.js';
import { AgentsAPI } from '../agents.js';
import { UsageAPI } from '../usage.js';
import { AuthAPI } from '../auth.js';
import { StorageAPI } from '../storage.js';
import { MountsAPI } from '../mounts.js';
import { FilesAPI } from '../files.js';

// Mock the config module so the client doesn't try to read from disk
vi.mock('../config.js', () => ({
  getApiUrl: vi.fn().mockResolvedValue('https://api.castari.com'),
  getAuth: vi.fn().mockResolvedValue(null),
}));

describe('CastariClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('creates client with default options', () => {
      const client = new CastariClient();

      expect(client).toBeInstanceOf(CastariClient);
      expect(client.agents).toBeDefined();
      expect(client.usage).toBeDefined();
      expect(client.auth).toBeDefined();
      expect(client.storage).toBeDefined();
      expect(client.mounts).toBeDefined();
      expect(client.files).toBeDefined();
    });

    it('creates client with apiKey', () => {
      const client = new CastariClient({ apiKey: 'cast_test123' });

      expect(client).toBeInstanceOf(CastariClient);
      // Verify the client was created without error - auth is set internally
      expect(client.agents).toBeDefined();
    });

    it('creates client with token', () => {
      const client = new CastariClient({ token: 'my-oauth-token' });

      expect(client).toBeInstanceOf(CastariClient);
      expect(client.agents).toBeDefined();
    });

    it('creates client with baseUrl', () => {
      const client = new CastariClient({ baseUrl: 'https://custom.api.com' });

      expect(client).toBeInstanceOf(CastariClient);
      expect(client.agents).toBeDefined();
    });

    it('creates client with all options combined', () => {
      const client = new CastariClient({
        apiKey: 'cast_test123',
        baseUrl: 'https://custom.api.com',
      });

      expect(client).toBeInstanceOf(CastariClient);
    });
  });

  describe('API modules', () => {
    it('has agents API module', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });
      expect(client.agents).toBeInstanceOf(AgentsAPI);
    });

    it('has usage API module', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });
      expect(client.usage).toBeInstanceOf(UsageAPI);
    });

    it('has auth API module', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });
      expect(client.auth).toBeInstanceOf(AuthAPI);
    });

    it('has storage API module', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });
      expect(client.storage).toBeInstanceOf(StorageAPI);
    });

    it('has mounts API module', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });
      expect(client.mounts).toBeInstanceOf(MountsAPI);
    });

    it('has files API module', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });
      expect(client.files).toBeInstanceOf(FilesAPI);
    });

    it('has all 6 API modules', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });

      const modules = [
        client.agents,
        client.usage,
        client.auth,
        client.storage,
        client.mounts,
        client.files,
      ];

      expect(modules).toHaveLength(6);
      modules.forEach((mod) => expect(mod).toBeDefined());
    });
  });

  describe('API modules are stable references', () => {
    it('agents property returns the same instance each time', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });
      const first = client.agents;
      const second = client.agents;

      expect(first).toBe(second);
    });

    it('all API modules are consistent across accesses', () => {
      const client = new CastariClient({ apiKey: 'cast_test' });

      expect(client.agents).toBe(client.agents);
      expect(client.usage).toBe(client.usage);
      expect(client.auth).toBe(client.auth);
      expect(client.storage).toBe(client.storage);
      expect(client.mounts).toBe(client.mounts);
      expect(client.files).toBe(client.files);
    });
  });
});
