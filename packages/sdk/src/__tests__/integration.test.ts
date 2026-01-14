import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CastariClient } from '../client.js';
import { AuthenticationError, NotFoundError } from '../errors.js';

/**
 * Integration tests against the real Castari API
 *
 * These tests require either:
 * - CASTARI_API_KEY environment variable set
 * - Or credentials in ~/.castari/credentials.yaml
 */

describe('CastariClient Integration Tests', () => {
  let client: CastariClient;
  let isAuthenticated = false;

  beforeAll(async () => {
    client = new CastariClient();
    try {
      await client.ensureAuthenticated();
      isAuthenticated = true;
    } catch {
      console.log('⚠ No credentials - some tests will be skipped');
    }
  });

  describe('Auth API', () => {
    it('should get current user with valid credentials', async () => {
      if (!isAuthenticated) {
        console.log('⚠ Skipping - no credentials');
        return;
      }

      const user = await client.auth.me();

      expect(user).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.id).toBeDefined();
      console.log('✓ Authenticated as:', user.email);
    });
  });

  describe('Agents API', () => {
    it('should list agents', async () => {
      if (!isAuthenticated) {
        console.log('⚠ Skipping - no credentials');
        return;
      }

      const agents = await client.agents.list();

      expect(Array.isArray(agents)).toBe(true);
      console.log(`✓ Found ${agents.length} agents`);

      if (agents.length > 0) {
        console.log('  Agents:', agents.map((a) => a.slug).join(', '));
        // Verify agent structure
        const agent = agents[0];
        expect(agent.id).toBeDefined();
        expect(agent.slug).toBeDefined();
        expect(agent.status).toBeDefined();
      }
    });

    it('should return 404 for non-existent agent', async () => {
      if (!isAuthenticated) {
        console.log('⚠ Skipping - no credentials');
        return;
      }

      try {
        await client.agents.get('non-existent-agent-12345');
        expect.fail('Should have thrown NotFoundError');
      } catch (error) {
        if (error instanceof NotFoundError) {
          console.log('✓ Correctly returned 404 for non-existent agent');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Usage API', () => {
    it('should get usage summary', async () => {
      if (!isAuthenticated) {
        console.log('⚠ Skipping - no credentials');
        return;
      }

      const usage = await client.usage.summary({ days: 30 });

      expect(usage).toBeDefined();
      expect(typeof usage.total_invocations).toBe('number');
      expect(typeof usage.total_cost_usd).toBe('number');
      expect(usage.period_start).toBeDefined();
      expect(usage.period_end).toBeDefined();

      console.log('✓ Usage summary:');
      console.log(`  Invocations: ${usage.total_invocations}`);
      console.log(`  Cost: $${usage.total_cost_usd.toFixed(4)}`);
    });

    it('should get daily usage', async () => {
      if (!isAuthenticated) {
        console.log('⚠ Skipping - no credentials');
        return;
      }

      const daily = await client.usage.daily({ days: 7 });

      expect(Array.isArray(daily)).toBe(true);
      console.log(`✓ Got ${daily.length} days of usage data`);

      if (daily.length > 0) {
        const day = daily[0];
        expect(day.date).toBeDefined();
        expect(typeof day.invocation_count).toBe('number');
        expect(typeof day.cost_usd).toBe('number');
      }
    });
  });
});

describe('Full Agent Lifecycle Test', () => {
  let client: CastariClient;
  let isAuthenticated = false;
  const testSlug = `test-agent-${Date.now()}`;

  beforeAll(async () => {
    client = new CastariClient();
    try {
      await client.ensureAuthenticated();
      isAuthenticated = true;
    } catch {
      // Not authenticated
    }
  });

  afterAll(async () => {
    // Clean up test agent if it exists
    if (isAuthenticated) {
      try {
        await client.agents.delete(testSlug);
        console.log('  (cleaned up test agent)');
      } catch {
        // Agent doesn't exist or already deleted
      }
    }
  });

  it('should create, get, and delete an agent', async () => {
    if (!isAuthenticated) {
      console.log('⚠ Skipping lifecycle test - no credentials');
      return;
    }

    // Create agent
    console.log(`Creating test agent: ${testSlug}`);
    const created = await client.agents.create({
      name: 'Test Agent',
      gitRepoUrl: 'https://github.com/anthropics/anthropic-quickstarts',
      slug: testSlug,
    });

    expect(created.slug).toBe(testSlug);
    expect(['draft', 'pending']).toContain(created.status);
    console.log(`✓ Agent created with status: ${created.status}`);

    // Get agent
    const fetched = await client.agents.get(testSlug);
    expect(fetched.slug).toBe(testSlug);
    expect(fetched.name).toBe('Test Agent');
    console.log('✓ Agent fetched');

    // Delete agent
    await client.agents.delete(testSlug);
    console.log('✓ Agent deleted');

    // Verify deletion
    try {
      await client.agents.get(testSlug);
      expect.fail('Agent should be deleted');
    } catch (error) {
      if (error instanceof NotFoundError) {
        console.log('✓ Verified agent is deleted');
      } else {
        throw error;
      }
    }
  });
});
