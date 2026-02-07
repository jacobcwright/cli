# @castari/sdk

Official Castari SDK for TypeScript and Node.js.

[![npm version](https://img.shields.io/npm/v/@castari/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@castari/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

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

// Update an agent
const updated = await client.agents.update('my-agent', {
  name: 'Updated Name',
  defaultModel: 'claude-sonnet-4-5-20250929',
  maxTurns: 10,
});

// Delete an agent
await client.agents.delete('my-agent');

// Deploy an agent
const agent = await client.agents.deploy('my-agent');

// Redeploy an agent
const agent = await client.agents.redeploy('my-agent');

// Stop an agent
await client.agents.stop('my-agent');

// Invoke an agent
const result = await client.agents.invoke('my-agent', {
  prompt: 'Your prompt here',
  sessionId: 'optional-session-id',
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

### Sessions

```typescript
// List sessions for an agent
const sessions = await client.agents.listSessions('my-agent');

// Delete a session
await client.agents.deleteSession('my-agent', 'session-id');
```

### Invocations

```typescript
// List invocation history
const invocations = await client.agents.listInvocations('my-agent', {
  status: 'completed',
  limit: 10,
});
```

### Auth

```typescript
// Get current user
const user = await client.auth.me();

// List API keys
const keys = await client.auth.listApiKeys();

// Create a named API key
const result = await client.auth.createApiKey('Production');
console.log(result.key); // Full key (only shown once)

// Revoke an API key
await client.auth.revokeApiKey(keyId);
```

### Usage

```typescript
// Get usage summary
const summary = await client.usage.summary({ days: 30 });

// Get daily breakdown
const daily = await client.usage.daily({ days: 7 });
```

### Storage (BYO Buckets)

```typescript
// List buckets
const buckets = await client.storage.list();

// Create a bucket
const bucket = await client.storage.create({
  name: 'My Bucket',
  slug: 'my-bucket',
  provider: 's3',
  bucketName: 'my-s3-bucket',
  region: 'us-east-1',
});

// Set credentials
await client.storage.setCredentials('my-bucket', {
  accessKeyId: '...',
  secretAccessKey: '...',
});

// Test connection
const result = await client.storage.testConnection('my-bucket');

// List files in bucket
const files = await client.storage.listFiles('my-bucket', { prefix: 'data/' });

// Get presigned URLs
const downloadUrl = await client.storage.getPresignedUrl('my-bucket', 'data/file.csv');
const uploadUrl = await client.storage.getPresignedUploadUrl('my-bucket', 'data/new.csv');

// Delete a bucket
await client.storage.delete('my-bucket');
```

### Mounts

```typescript
// List mounts for an agent
const mounts = await client.mounts.list('my-agent');

// Add a mount
const mount = await client.mounts.add('my-agent', {
  bucketSlug: 'my-bucket',
  mountPath: '/data',
  sourcePrefix: 'agent-data/',
  permissionRules: [{ path: '/', mode: 'rw' }],
});

// Update a mount
await client.mounts.update('my-agent', mount.id, {
  cacheEnabled: true,
  cacheTtlSeconds: 300,
});

// Remove a mount
await client.mounts.remove('my-agent', mount.id);
```

### Files (Managed Storage v2)

```typescript
// Upload a file
const file = await client.files.upload('report.pdf', buffer, {
  description: 'Monthly report',
  tags: ['reports'],
});

// List files
const files = await client.files.list({ scope: 'user', search: 'report' });

// Download a file
const response = await client.files.download(fileId);

// Get storage usage
const usage = await client.files.getUsage();

// Attach a file to an agent
await client.files.attachToAgent('my-agent', {
  fileId: file.file_id,
  mountPath: '/files/report.pdf',
});

// List agent files
const agentFiles = await client.files.listAgentFiles('my-agent');

// Detach a file
await client.files.detachFromAgent('my-agent', fileId);
```

## Error Handling

```typescript
import {
  CastariError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  BadRequestError,
  ServerError,
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
  } else if (error instanceof CastariError) {
    console.log(`Error ${error.statusCode}: ${error.message}`);
  }
}
```

## License

MIT
