# @castari/sdk

Official Castari SDK for TypeScript and Node.js.

## Installation

```bash
npm install @castari/sdk
```

## Quick Start

```typescript
import { CastariClient } from '@castari/sdk';

// Using API key
const client = new CastariClient({
  apiKey: process.env.CASTARI_API_KEY,
});

// Or let it load from ~/.castari/credentials.yaml
const client = new CastariClient();
await client.ensureAuthenticated();

// List agents
const agents = await client.agents.list();

// Deploy an agent
await client.agents.deploy('my-agent');

// Invoke an agent
const result = await client.agents.invoke('my-agent', {
  prompt: 'Hello, world!',
});

console.log(result.response_content);
```

## API Reference

### CastariClient

```typescript
const client = new CastariClient({
  apiKey?: string,    // API key (cast_...)
  token?: string,     // OAuth token
  baseUrl?: string,   // API base URL
});
```

### Agents

```typescript
// List all agents
const agents = await client.agents.list();

// Create an agent
const agent = await client.agents.create({
  name: 'My Agent',
  gitRepoUrl: 'https://github.com/user/repo',
  slug: 'my-agent',
});

// Get agent by slug
const agent = await client.agents.get('my-agent');

// Delete an agent
await client.agents.delete('my-agent');

// Deploy an agent
const agent = await client.agents.deploy('my-agent');

// Invoke an agent
const result = await client.agents.invoke('my-agent', {
  prompt: 'Your prompt here',
});
```

### Secrets

```typescript
// List secrets (keys only, values are never returned)
const secrets = await client.agents.listSecrets('my-agent');

// Set a secret
await client.agents.setSecret('my-agent', 'API_KEY', 'secret-value');

// Delete a secret
await client.agents.deleteSecret('my-agent', 'API_KEY');
```

### Usage

```typescript
// Get usage summary
const summary = await client.usage.summary({ days: 30 });

// Get daily breakdown
const daily = await client.usage.daily({ days: 7 });
```

### Auth

```typescript
// Get current user
const user = await client.auth.me();

// Create API key
const { api_key, prefix } = await client.auth.createApiKey();

// Revoke API key
await client.auth.revokeApiKey();
```

## Error Handling

```typescript
import {
  CastariError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from '@castari/sdk';

try {
  await client.agents.get('non-existent');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Agent not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Not authenticated');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited, retry in ${error.retryAfter}s`);
  }
}
```

## License

MIT
