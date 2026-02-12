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

Castari is the fastest way to go from an AI agent idea to a production deployment. Build your agent with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) and `cast deploy` handles the rest — packaging, infrastructure, and isolated sandboxes. No Docker. No Kubernetes. No infra to manage.

## Why Castari

### Your agent gets its own computer

Every deployed agent runs in an isolated cloud sandbox — a real machine with a filesystem, a shell, and a package manager. Your agent can read and write files, install dependencies, run code, and iterate on its own output. It's not a text-completion endpoint with tool definitions bolted on. It's a computer.

This is the difference between an agent that *suggests* a fix and one that actually opens the file, edits it, runs the tests, and keeps going until they pass.

### No risk to your machine or your users' machines

AI agents that run locally inherit every permission you have — SSH keys, environment variables, credentials, production databases. One prompt injection or hallucinated command and the blast radius is your entire system. Castari eliminates this by running agents in isolated sandboxes where they can work freely without putting anything else at risk. No permission prompts. No `--dangerously-skip-permissions`. Just a safe environment where agents can do real work.

## Install

```bash
npm install -g @castari/cli
```

Verify it worked:

```bash
cast --version
```

> **Using [Claude Code](https://claude.ai/code)?** Skip the manual setup — type `/castari-deploy` and the skill handles install, auth, scaffolding, and deployment for you. Install it with `npx skills add castari/cli`.

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

Or start from scratch — any repo with a `castari.json` is deployable.

## How It Works

```
You write code          Castari handles infra         Users invoke agents
┌─────────────┐        ┌──────────────────┐          ┌─────────────────┐
│ castari.json │──────▶ │  cast deploy     │ ──────▶  │ cast invoke     │
│ src/index.ts │  push  │  ┌────────────┐  │  ready   │   API / CLI     │
│              │        │  │  Sandbox   │  │          │                 │
└─────────────┘        │  └────────────┘  │          └─────────────────┘
                        └──────────────────┘
```

1. **Define** — `castari.json` configures your agent (name, entrypoint, runtime). Your agent code uses the Claude Agent SDK with whatever tools, MCP servers, or custom logic you need.
2. **Deploy** — `cast deploy` packages your project and spins up an isolated sandbox — a real machine with a filesystem, shell access, and your dependencies installed. Your agent is ready to receive prompts.
3. **Invoke** — Call your agent from the CLI, the REST API, or the [dashboard](https://app.castari.com). Each session gets its own sandbox, so agents can work with files and state without stepping on each other.

## Build Your Agent

Castari deploys agents built with the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). The SDK gives you the same tools, agent loop, and context management that power Claude Code — programmable in TypeScript.

```typescript
// src/index.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] },
})) {
  if ("result" in message) console.log(message.result);
}
```

```bash
cast deploy
cast invoke my-agent "Refactor this function to use async/await"
```

Your agent code is your agent. Castari just gets it running in production.

New to the Agent SDK? Check out the [official getting started guide](https://platform.claude.com/docs/en/agent-sdk/overview).

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

Your agent just needs a `castari.json` at the project root:

```json
{
  "name": "my-agent",
  "version": "0.1.0",
  "entrypoint": "src/index.ts",
  "runtime": "node"
}
```

The `entrypoint` points to your agent code — a TypeScript file using the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview).

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
