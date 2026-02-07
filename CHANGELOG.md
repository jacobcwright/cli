# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-02-07

### Breaking Changes

- Agent status enum changed: removed `pending`, renamed `failed` to `error`. Valid statuses are now `draft | deploying | active | stopped | error`
- Stop endpoint changed from `POST /agents/{slug}/stop` to `DELETE /agents/{slug}/sandbox`
- API key prefix changed from `csk_` to `cast_`

### New Features

- `cast agents update <slug>` command with `--name`, `--description`, `--git-url`, `--git-branch`, `--model`, `--max-turns`, `--timeout` flags
- `cast agents redeploy <slug>` command for quick redeployment
- Multi-key API: `cast apikey list`, `cast apikey create --name`, `cast apikey revoke <key-id>`
- `cast sessions list <slug>` and `cast sessions delete <slug> <session-id>` commands
- `cast invocations list <slug>` command with `--status` and `--limit` filters
- SDK: Added `agents.update()`, `agents.redeploy()`, `agents.listSessions()`, `agents.deleteSession()`, `agents.listInvocations()` methods
- SDK: Rewritten `auth` module with `listApiKeys()`, `createApiKey(name)`, `revokeApiKey(keyId)` methods

### Improvements

- ESLint configuration with `@typescript-eslint/recommended`
- Prettier configuration (semi, singleQuote, trailingComma: es5)
- 95 SDK unit tests and 24 CLI tests
- CI pipeline updated with lint and format check steps
- Full README overhaul with badges, command reference, SDK examples, and architecture diagram
- SDK README rewritten with complete API module documentation
- CONTRIBUTING.md with development setup and conventions

## [0.2.2] - 2026-01-14

### Added

- Initial release of `@castari/cli` and `@castari/sdk`
- **Authentication**
  - `cast login` - OAuth authentication via browser
  - `cast logout` - Clear stored credentials
  - `cast whoami` - Display current user info
  - `cast apikey create` - Create API key for CI/CD
  - `cast apikey revoke` - Revoke API key
- **Agent Management**
  - `cast agents list` - List all agents
  - `cast agents create` - Create a new agent from git repo
  - `cast agents get` - Get agent details
  - `cast agents delete` - Delete an agent
- **Deployment**
  - `cast deploy` - Deploy an agent
  - `cast invoke` - Invoke an agent with a prompt
- **Secrets**
  - `cast secrets list` - List secret keys
  - `cast secrets set` - Set a secret
  - `cast secrets delete` - Delete a secret
- **Usage**
  - `cast usage` - View usage statistics
- **SDK**
  - `CastariClient` class for programmatic access
  - Full TypeScript types
  - Automatic credential loading from `~/.castari/`
  - Support for both OAuth tokens and API keys

### Changed

- Updated the default API URL to `https://api.castari.com`
- Updated the SDK to use the new default API URL
- Updated the CLI to use the new default API URL
