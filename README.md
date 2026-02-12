<div align="center">

<img alt="Castari" src="./assets/logo.svg" height="60">

### Deploy AI agents with one command.

Define your agent. Run `cast deploy`. It's live.

[![npm version](https://img.shields.io/npm/v/@castari/cli.svg?style=flat-square)](https://www.npmjs.com/package/@castari/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)

[Documentation](https://docs.castari.com) &middot; [Dashboard](https://app.castari.com) &middot; [Discord](https://discord.gg/castari) &middot; [Examples](https://docs.castari.com/guides/templates)

</div>

<!-- TODO: Add terminal demo GIF here before launch
     Record with: https://github.com/faressoft/terminalizer
     Show: cast login → cast init → cast deploy → cast invoke
     Keep under 15 seconds, optimize to <5MB -->

---

Castari is the fastest way to go from an AI agent idea to a production deployment. Build your agent with the [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/agent-sdk), define a system prompt, and `cast deploy` handles the rest — packaging, infrastructure, and isolated sandboxes. No Docker. No Kubernetes. No infra to manage.

## Install

```bash
npm install -g @castari/cli
```

Verify it worked:

```bash
cast --version
```

## Quick Start

```bash
# 1. Authenticate
cast login

# 2. Scaffold an agent
cast init my-agent
cd my-agent

# 3. Deploy to production
cast deploy

# 4. Talk to your agent
cast invoke my-agent "Summarize the top HN stories today"
```

That's it. Your agent is live, running in an isolated sandbox, accessible via CLI or API.

## What You Can Build

Castari ships with starter templates to get you going:

| Template | What it does |
|----------|-------------|
| `cast init --template default` | General-purpose coding assistant with file and bash tools |
| `cast init --template research-agent` | Web research agent that searches, synthesizes, and reports |
| `cast init --template mcp-tools` | Agent with custom [MCP](https://modelcontextprotocol.io) tool servers |
| `cast init --template support-agent` | Customer support agent with knowledge base access |

Or start from scratch — any repo with a `castari.json` and a `CLAUDE.md` system prompt is deployable.

## How It Works

```
You write code          Castari handles infra         Users invoke agents
┌─────────────┐        ┌──────────────────┐          ┌─────────────────┐
│ castari.json │──────▶ │  cast deploy     │ ──────▶  │ cast invoke     │
│ CLAUDE.md    │  push  │  ┌────────────┐  │  ready   │   API / CLI     │
│ src/         │        │  │  Sandbox   │  │          │                 │
└─────────────┘        │  └────────────┘  │          └─────────────────┘
                        └──────────────────┘
```

1. **Define** — `castari.json` configures your agent (name, entrypoint, runtime). `CLAUDE.md` is the system prompt. Add tools, MCP servers, or custom logic in `src/`.
2. **Deploy** — `cast deploy` packages your project and spins up an isolated sandbox with your agent ready to receive prompts.
3. **Invoke** — Call your agent from the CLI, the REST API, or the [dashboard](https://app.castari.com).

## Build Your Agent

Castari deploys agents built with the [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/agent-sdk). Write your agent in TypeScript, give it tools, connect MCP servers — then deploy it with a single command.

```typescript
// src/index.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  system: "You are a helpful coding assistant.",
  messages: [{ role: "user", content: process.argv[2] }],
});

console.log(response.content[0].text);
```

```bash
cast deploy
cast invoke my-agent "Refactor this function to use async/await"
```

Your agent code is your agent. Castari just gets it running in production.

## CLI Commands

The CLI gives you full control over the agent lifecycle:

```bash
cast login                          # Authenticate via browser
cast init [template]                # Scaffold a new agent project
cast deploy [slug]                  # Deploy to production
cast invoke <slug> "<prompt>"       # Send a prompt to your agent
cast agents list                    # List all your agents
cast secrets set <slug> KEY value   # Manage agent secrets
cast usage                          # Monitor usage and costs
```

[Full CLI reference &rarr;](https://docs.castari.com/cli/overview)

## Configuration

Your agent is defined by two files at the project root:

**`castari.json`** — Agent metadata:
```json
{
  "name": "my-agent",
  "version": "0.1.0",
  "entrypoint": "src/index.ts",
  "runtime": "node"
}
```

**`CLAUDE.md`** — System prompt that defines your agent's personality, capabilities, and instructions.

**Environment variables:**

| Variable | Description |
|----------|-------------|
| `CASTARI_API_KEY` | API key for programmatic auth (prefix: `cast_`) |
| `CASTARI_API_URL` | Override API base URL (default: `https://api.castari.com`) |

Credentials from `cast login` are stored in `~/.castari/credentials.yaml`.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

```bash
git clone https://github.com/castari/cli.git && cd cli
pnpm install && pnpm build && pnpm test
```

## Community

- [Documentation](https://docs.castari.com) — Guides, API reference, and examples
- [Dashboard](https://app.castari.com) — Manage and monitor your agents
- [Discord](https://discord.gg/castari) — Get help and share what you're building
- [GitHub Issues](https://github.com/castari/cli/issues) — Bug reports and feature requests

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**[Get started in 60 seconds &rarr;](https://docs.castari.com/quickstart)**

</div>
