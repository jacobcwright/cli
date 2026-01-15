# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
