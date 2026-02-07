# Contributing to Castari CLI

Thank you for your interest in contributing to the Castari CLI! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9
- [Git](https://git-scm.com/)

## Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/cli.git
   cd cli
   ```

3. **Install dependencies:**

   ```bash
   pnpm install
   ```

4. **Build all packages:**

   ```bash
   pnpm build
   ```

5. **Run tests:**

   ```bash
   pnpm test
   ```

6. **Link CLI for local testing:**

   ```bash
   cd packages/cli && pnpm link --global
   cast --version
   ```

## Project Structure

```
packages/
├── sdk/    # @castari/sdk - TypeScript SDK
│   └── src/
│       ├── client.ts     # Main client class
│       ├── agents.ts     # Agents API
│       ├── auth.ts       # Auth API
│       ├── usage.ts      # Usage API
│       ├── storage.ts    # Storage API
│       ├── mounts.ts     # Mounts API
│       ├── files.ts      # Files API
│       ├── http.ts       # HTTP client
│       ├── config.ts     # Config/credential management
│       ├── errors.ts     # Error classes
│       └── types.ts      # TypeScript interfaces
└── cli/    # @castari/cli - CLI tool
    └── src/
        ├── index.ts      # Commander program
        ├── commands/     # Command implementations
        └── utils/        # Output formatting, error handling
```

## Development Workflow

### Making Changes

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and ensure they build:

   ```bash
   pnpm build
   ```

3. Run tests and linting:

   ```bash
   pnpm test
   pnpm lint
   pnpm format:check
   ```

4. Fix formatting if needed:

   ```bash
   pnpm format
   ```

### Adding a New CLI Command

1. Create a new file in `packages/cli/src/commands/`
2. Export the command using Commander
3. Register it in `packages/cli/src/index.ts`
4. Add SDK methods to `packages/sdk/src/` if needed
5. Add tests

### Adding SDK Methods

1. Add TypeScript interfaces to `packages/sdk/src/types.ts`
2. Add the method to the appropriate API class
3. Export new types from `packages/sdk/src/index.ts`
4. Add unit tests in `packages/sdk/src/__tests__/`

## Pull Request Process

1. Update documentation if your changes affect the public API
2. Add tests for new functionality
3. Ensure all checks pass (`pnpm build && pnpm test && pnpm lint`)
4. Write a clear PR description explaining what and why
5. Link any related issues

## Commit Conventions

We use conventional commit messages:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Tooling, dependencies, CI

Examples:

```
feat: add agents update command
fix: correct stop endpoint to use DELETE /sandbox
docs: update SDK README with storage examples
test: add auth API unit tests
```

## Code Style

- TypeScript with strict mode
- 2-space indentation
- Single quotes
- Trailing commas (ES5)
- Semicolons

The project uses ESLint and Prettier. Run `pnpm format` to auto-fix formatting.

## Reporting Issues

- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) for bugs
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml) for new features
- Include CLI version (`cast --version`) and Node.js version (`node --version`)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
