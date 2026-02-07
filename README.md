<div align="center">

# Castari CLI

**Deploy AI agents with one command.**

[![npm version](https://img.shields.io/npm/v/@castari/cli.svg?style=flat-square)](https://www.npmjs.com/package/@castari/cli)
[![npm version](https://img.shields.io/npm/v/@castari/sdk.svg?style=flat-square&label=sdk)](https://www.npmjs.com/package/@castari/sdk)
[![CI](https://img.shields.io/github/actions/workflow/status/castari/cli/ci.yml?branch=main&style=flat-square)](https://github.com/castari/cli/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?style=flat-square)](https://www.typescriptlang.org)

[Documentation](https://docs.castari.com) · [Dashboard](https://app.castari.com) · [API Reference](https://docs.castari.com/api-reference/introduction)

</div>

---

## Features

- **One-command deploy** — `cast deploy` packages and ships your agent to an isolated sandbox
- **Git or local** — Deploy from a Git repository or directly from your local project
- **Full agent lifecycle** — Create, deploy, invoke, stop, redeploy, and manage sessions
- **Multi-key auth** — Named API keys for Production, Development, CI/CD environments
- **Storage v2** — Managed file storage with agent file attachments
- **BYO Storage** — Mount S3, GCS, or R2 buckets directly into agent sandboxes
- **TypeScript SDK** — Programmatic access to every API endpoint
- **Usage tracking** — Monitor invocations, tokens, and costs

## Quick Start

```bash
npm install -g @castari/cli
cast login
cast init my-agent
cd my-agent
cast deploy
cast invoke my-agent "Hello, world!"
```

## Command Reference

| Command | Description |
|---------|-------------|
| `cast login` | Authenticate via browser (OAuth) |
| `cast logout` | Clear stored credentials |
| `cast whoami` | Show current user info |
| `cast apikey list` | List all API keys |
| `cast apikey create --name <n>` | Create a named API key |
| `cast apikey revoke <key-id>` | Revoke an API key |
| `cast init [template]` | Create a new agent from a template |
| `cast agents list` | List all agents |
| `cast agents create <name> <git-url>` | Create an agent from a Git repo |
| `cast agents get <slug>` | Get agent details |
| `cast agents update <slug>` | Update agent configuration |
| `cast agents delete <slug>` | Delete an agent |
| `cast agents files list <slug>` | List files attached to an agent |
| `cast agents files add <slug> <file-id>` | Attach a file to an agent |
| `cast agents files remove <slug> <file-id>` | Detach a file from an agent |
| `cast deploy [slug]` | Deploy an agent (local project or by slug) |
| `cast stop <slug>` | Stop a running agent |
| `cast invoke <slug> "<prompt>"` | Invoke a deployed agent |
| `cast secrets list <slug>` | List secret keys for an agent |
| `cast secrets set <slug> <key> <value>` | Set a secret |
| `cast secrets delete <slug> <key>` | Delete a secret |
| `cast usage [--days N] [--daily]` | Show usage statistics |
| `cast sessions list <slug>` | List sessions for an agent |
| `cast sessions delete <slug> <id>` | Delete a session |
| `cast invocations list <slug>` | View invocation history |
| `cast buckets list` | List storage buckets |
| `cast buckets create` | Create a storage bucket |
| `cast mounts list <slug>` | List agent mounts |
| `cast mounts add <slug>` | Mount a bucket to an agent |
| `cast files list` | List managed files |
| `cast files upload <path>` | Upload a file |

## SDK

The CLI is built on `@castari/sdk`, which you can use directly:

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

// Deploy and invoke
await client.agents.deploy('my-agent');
const result = await client.agents.invoke('my-agent', {
  prompt: 'Analyze this dataset and summarize key trends.',
});
console.log(result.response_content);
console.log(`Cost: $${result.total_cost_usd}`);

// Manage API keys
const keys = await client.auth.listApiKeys();
const newKey = await client.auth.createApiKey('CI/CD');

// Usage statistics
const summary = await client.usage.summary({ days: 30 });

// Storage
const buckets = await client.storage.list();
await client.files.upload('data.csv', buffer);
```

The SDK provides 6 API modules:

| Module | Access | Description |
|--------|--------|-------------|
| `client.agents` | `AgentsAPI` | Agent CRUD, deploy, invoke, sessions, invocations, secrets |
| `client.auth` | `AuthAPI` | User info, API key management |
| `client.usage` | `UsageAPI` | Usage summaries and daily breakdowns |
| `client.storage` | `StorageAPI` | BYO storage bucket management |
| `client.mounts` | `MountsAPI` | Agent-to-bucket mount configuration |
| `client.files` | `FilesAPI` | Managed file storage (upload, download, attach) |

## Architecture

```
castari/cli (pnpm monorepo)
├── packages/
│   ├── sdk/              # @castari/sdk — TypeScript SDK
│   │   └── src/
│   │       ├── client.ts     # CastariClient entry point
│   │       ├── agents.ts     # AgentsAPI
│   │       ├── auth.ts       # AuthAPI
│   │       ├── usage.ts      # UsageAPI
│   │       ├── storage.ts    # StorageAPI
│   │       ├── mounts.ts     # MountsAPI
│   │       ├── files.ts      # FilesAPI
│   │       ├── http.ts       # HTTP client with error handling
│   │       ├── config.ts     # Credential & config management
│   │       ├── errors.ts     # Error class hierarchy
│   │       └── types.ts      # All TypeScript interfaces
│   └── cli/              # @castari/cli — CLI tool
│       └── src/
│           ├── index.ts      # Commander program entry
│           ├── commands/     # One file per command group
│           └── utils/        # Output formatting, error handling
└── templates/            # Agent starter templates
    ├── basic/
    ├── research/
    ├── coding-assistant/
    └── mcp/
```

## Configuration

Credentials are stored in `~/.castari/credentials.yaml` (mode 0600).

| Environment Variable | Description |
|---------------------|-------------|
| `CASTARI_API_KEY` | API key for authentication |
| `CASTARI_API_URL` | Override API base URL (default: `https://api.castari.com`) |

## Development

```bash
# Clone and install
git clone https://github.com/castari/cli.git
cd cli
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format:check

# Link CLI for local testing
cd packages/cli && pnpm link --global
cast --version
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

[![SPONSORED BY E2B FOR STARTUPS](https://img.shields.io/badge/SPONSORED%20BY-E2B%20FOR%20STARTUPS-ff8800?style=for-the-badge)](https://e2b.dev/startups)
&nbsp;&nbsp;
[![Daytona Startup Grid](./assets/daytona-startup-grid.png)](https://daytona.io)

</div>
