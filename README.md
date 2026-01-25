# Castari CLI

Deploy AI agents with one command.

[![npm version](https://img.shields.io/npm/v/@castari/cli.svg)](https://www.npmjs.com/package/@castari/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install -g @castari/cli
```

## Quick Start

```bash
# Authenticate with Castari
cast login

# Create an agent from a git repository
cast agents create my-agent https://github.com/user/my-agent --slug my-agent

# Deploy the agent
cast deploy my-agent

# Invoke the agent
cast invoke my-agent "Hello, world!"
```

## Commands

### Authentication

```bash
cast login                  # Authenticate via browser (OAuth)
cast logout                 # Clear stored credentials
cast whoami                 # Show current user info
cast apikey create          # Create an API key for CI/CD
cast apikey revoke          # Revoke your API key
```

### Agent Management

```bash
cast agents list                                    # List all agents
cast agents create <name> <git-url> --slug <slug>   # Create a new agent
cast agents get <slug>                              # Get agent details
cast agents delete <slug> [--force]                 # Delete an agent
```

### Deployment & Invocation

```bash
cast deploy <slug>                    # Deploy an agent
cast invoke <slug> "<prompt>"         # Invoke an agent
cast invoke <slug> --input <file>     # Invoke with prompt from file
```

### Secrets

```bash
cast secrets list <slug>                  # List secret keys
cast secrets set <slug> <key> <value>     # Set a secret
cast secrets delete <slug> <key>          # Delete a secret
```

### Usage Statistics

```bash
cast usage                  # Show usage summary (last 30 days)
cast usage --days 7         # Show usage for specific period
cast usage --daily          # Show daily breakdown
```

## Authentication

### Interactive (OAuth)

For local development, authenticate via browser:

```bash
cast login
```

This opens your browser to sign in and stores credentials in `~/.castari/credentials.yaml`.

### CI/CD (API Key)

For automated environments, use an API key:

```bash
# Create an API key
cast apikey create

# Use it in CI/CD
export CASTARI_API_KEY="cast_..."
cast deploy my-agent
```

## SDK

The CLI is built on `@castari/sdk`, which you can use directly for programmatic access:

```bash
npm install @castari/sdk
```

```typescript
import { CastariClient } from '@castari/sdk';

const client = new CastariClient({
  apiKey: process.env.CASTARI_API_KEY,
});

// List agents
const agents = await client.agents.list();

// Deploy an agent
await client.agents.deploy('my-agent');

// Invoke an agent
const result = await client.agents.invoke('my-agent', {
  prompt: 'Hello, world!',
});

console.log(result.response_content);
console.log(`Cost: $${result.total_cost_usd}`);
```

## Configuration

Credentials are stored in `~/.castari/credentials.yaml` (mode 0600).

Environment variables:
- `CASTARI_API_KEY` - API key for authentication
- `CASTARI_API_URL` - Override API base URL (default: https://api.castari.com)

## Development

This is a pnpm monorepo with two packages:

```
packages/
├── sdk/    # @castari/sdk - TypeScript SDK
└── cli/    # @castari/cli - CLI tool
```

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Link CLI for local testing
cd packages/cli && pnpm link --global
```

## License

MIT - see [LICENSE](LICENSE) for details.

---

[![SPONSORED BY E2B FOR STARTUPS](https://img.shields.io/badge/SPONSORED%20BY-E2B%20FOR%20STARTUPS-ff8800?style=for-the-badge)](https://e2b.dev/startups)
&nbsp;&nbsp;
[![Daytona Startup Grid](./assets/daytona-startup-grid.png)](https://daytona.io)
