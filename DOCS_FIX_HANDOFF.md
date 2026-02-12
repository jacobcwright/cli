# Documentation Fix Handoff

## Overview

A stress test of the Castari documentation revealed **8 issues** where the docs don't match the actual CLI/SDK/API implementation. These range from critical (documenting features that don't exist) to medium severity (incorrect parameter descriptions).

**Priority:** The 3 critical issues should be fixed ASAP as they will cause immediate user failures.

---

## GitHub Issues

All issues have been filed in the docs repo with detailed descriptions:

### Critical (Fix Immediately)

| Issue | Problem | Link |
|-------|---------|------|
| #2 | `cast logs` command is fully documented but doesn't exist in CLI | https://github.com/castari/docs/issues/2 |
| #3 | `cast invoke` options are completely wrong (docs show `--stream`, `--timeout`, `--json` but actual is `-i`, `-s`) | https://github.com/castari/docs/issues/3 |
| #4 | `cast deploy` takes `[slug]` not `[path]`, and has no options | https://github.com/castari/docs/issues/4 |

### High Severity

| Issue | Problem | Link |
|-------|---------|------|
| #5 | SDK `invoke()` signature wrong - should be `invoke(slug, { prompt })` not `invoke(slug, prompt)` | https://github.com/castari/docs/issues/5 |
| #6 | API auth header may be `Authorization: Bearer` not `X-API-Key` | https://github.com/castari/docs/issues/6 |
| #7 | Many API endpoints undocumented (streaming, upload-code, sessions, etc.) | https://github.com/castari/docs/issues/7 |
| #8 | SDK methods `uploadCode()`, `listSecrets()`, `setSecret()`, `deleteSecret()` undocumented | https://github.com/castari/docs/issues/8 |

### Medium Severity

| Issue | Problem | Link |
|-------|---------|------|
| #9 | SDK `create()` has `name` required and `slug` optional, docs show opposite | https://github.com/castari/docs/issues/9 |

---

## Repository References

### Documentation (what needs to be fixed)
- **GitHub:** https://github.com/castari/docs
- **Live site:** https://docs.castari.com
- **Framework:** Mintlify

### CLI & SDK (source of truth for CLI/SDK docs)
- **GitHub:** https://github.com/castari/cli
- **Local path:** `/Users/jacobwright/Desktop/cli`
- **CLI source:** `/Users/jacobwright/Desktop/cli/packages/cli/`
- **SDK source:** `/Users/jacobwright/Desktop/cli/packages/sdk/`

### API (source of truth for API docs)
- **GitHub:** https://github.com/castari/api (PR #8 for latest)
- **Local path:** `/Users/jacobwright/Desktop/claude-agent-platform`
- **Endpoints:** `/Users/jacobwright/Desktop/claude-agent-platform/backend/app/api/endpoints/`

---

## Quick Verification Commands

Run these from `/Users/jacobwright/Desktop/cli` to verify the issues:

```bash
# Issue #2: Verify cast logs doesn't exist
node packages/cli/bin/cast.js logs --help
# Expected: Returns main help (command not found)

# Issue #3: Verify cast invoke actual options
node packages/cli/bin/cast.js invoke --help
# Expected: Shows -i, --input and -s, --session (NOT --stream, --timeout, --json)

# Issue #4: Verify cast deploy signature
node packages/cli/bin/cast.js deploy --help
# Expected: Shows [slug] argument with no options

# Issue #5: Check SDK invoke signature
cat packages/sdk/src/agents.ts | grep -A5 "async invoke"
# Expected: invoke(slug: string, options: InvokeOptions)

# Issue #9: Check SDK create options
cat packages/sdk/src/types.ts | grep -A10 "CreateAgentOptions"
# Expected: name is required, slug is optional
```

---

## Suggested Fix Order

### Phase 1: Critical Fixes (Day 1)

1. **Remove or stub `/cli/logs`** - Either delete the page or add a "Coming Soon" notice
2. **Rewrite `/cli/invoke`** - Replace fake options with real ones (`-i`, `-s`)
3. **Rewrite `/cli/deploy`** - Fix argument from `path` to `slug`, remove fake options

### Phase 2: SDK Fixes (Day 1-2)

4. **Fix `/sdk/overview`** - Update quick example to use `{ prompt: '...' }` syntax
5. **Fix `/sdk/agents`** - Correct `invoke()` and `create()` signatures
6. **Add missing SDK methods** - Document `uploadCode()`, secrets methods

### Phase 3: API Fixes (Day 2-3)

7. **Verify auth header** - Test against live API and update if needed
8. **Add missing endpoints** - Prioritize streaming (`/stream`) and code upload

---

## Additional Context

### Why This Matters
- Users following the quickstart will hit errors immediately when trying `cast invoke --stream`
- The SDK examples won't even compile in TypeScript due to wrong signatures
- `cast logs` being in the navigation makes it look like a core feature

### Detailed Issues Report
A comprehensive markdown report with all findings is saved at:
`/Users/jacobwright/Desktop/cli/DOCS_ISSUES.md`

### What Was Tested
- CLI: All commands verified against `--help` output
- SDK: Source code in `packages/sdk/src/` examined
- API: Endpoint code in `backend/app/api/endpoints/` examined
- Docs: All pages in Getting Started, CLI Reference, SDK Reference, and API Reference sections

---

## Questions?

The issues on GitHub contain full details including:
- Exact documentation quotes
- Exact code behavior
- Recommended fixes
- Verification steps

If anything is unclear, the source code is the ultimate source of truth:
- CLI commands: `packages/cli/src/commands/*.ts`
- SDK methods: `packages/sdk/src/*.ts`
- API endpoints: `backend/app/api/endpoints/*.py`
