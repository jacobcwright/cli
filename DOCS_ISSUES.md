# Castari Documentation Issues Report

**Date:** 2026-01-29
**Docs Site:** https://docs.castari.com
**Reviewed By:** Claude Code Stress Test

---

## Summary

This report documents discrepancies between the Castari documentation and the actual CLI/SDK/API implementation. Issues are categorized by severity.

---

## Critical Issues (Docs Document Non-Existent Features)

### 1. `cast logs` Command Does Not Exist

**Location:** https://docs.castari.com/cli/logs

**Issue:** The documentation has a full page documenting `cast logs` with:
- Usage: `cast logs <slug> [options]`
- Options: `-n, --lines`, `-f, --follow`, `--json`, `--invocation`
- Multiple examples and output samples

**Reality:** This command does not exist in the CLI. Running `cast logs` returns the main help (command not found).

**Severity:** Critical - Users will attempt to use this command and fail.

---

### 2. `cast invoke` Options Are Completely Wrong

**Location:** https://docs.castari.com/cli/invoke

**Documented Options:**
```
--stream           Stream response in real-time
--timeout <ms>     Timeout in milliseconds (default: 120000)
--json             Output raw JSON response
--stdin            Pipe input from stdin
```

**Actual Options:**
```
-i, --input <file>   Read prompt from file
-s, --session <id>   Session ID for conversation continuity
```

**Issue:** The documented options don't exist, and the actual options aren't documented at all.

**Additional Issue:** The docs also reference `cast logs` in the error handling section ("Check cast logs for details") which doesn't exist.

**Severity:** Critical - All documented invoke options are wrong.

---

### 3. `cast deploy` Arguments and Options Are Wrong

**Location:** https://docs.castari.com/cli/deploy

**Documented:**
- Usage: `cast deploy [path] [options]`
- Argument: `path` - Path to agent directory
- Options: `-s, --slug`, `-n, --name`, `--no-install`

**Actual:**
- Usage: `cast deploy [slug]`
- Argument: `slug` - Agent slug (not a path!)
- Options: None (only `-h, --help`)

**Issue:** The docs describe a completely different command signature.

**Severity:** Critical - Fundamental mismatch in how the command works.

---

## High Severity Issues (Incorrect API/SDK Documentation)

### 4. SDK `invoke()` Method Signature is Wrong

**Location:** https://docs.castari.com/sdk/agents, https://docs.castari.com/sdk/overview

**Documented:**
```typescript
client.agents.invoke(slug, prompt, options?)
// Returns: Promise<InvocationResult>
```

**Actual Implementation:**
```typescript
client.agents.invoke(slug, options: InvokeOptions)
// where InvokeOptions = { prompt: string; sessionId?: string }
// Returns: Promise<InvocationResponse>
```

**Issues:**
1. Wrong parameter signature (prompt is inside options object, not separate)
2. Wrong return type name (`InvocationResult` vs `InvocationResponse`)
3. SDK Overview Quick Example is wrong: shows `invoke('my-agent', 'Hello!')` but should be `invoke('my-agent', { prompt: 'Hello!' })`

**Severity:** High - Code examples won't compile/work.

---

### 5. API Authentication Header Mismatch

**Location:** https://docs.castari.com/api-reference/introduction

**Documented:**
```bash
curl ... -H "X-API-Key: cast_xxx"
```

**Actual (from API code):**
API keys are passed via `Authorization: Bearer cast_xxx...` header, the same as OAuth tokens.

**Severity:** High - API calls with documented header may fail.

---

### 6. Missing API Endpoints in Documentation

**Location:** https://docs.castari.com/api-reference/introduction

**Undocumented endpoints that exist:**
- `POST /api/v1/agents/{slug}/stream` - Streaming invocations (SSE)
- `POST /api/v1/agents/{slug}/upload-code` - Direct code upload
- `POST /api/v1/agents/{slug}/redeploy` - Redeploy with fresh code
- `GET/POST/DELETE /api/v1/api-keys/*` - Multi-key management
- `GET/DELETE /api/v1/agents/{slug}/sessions/*` - Session management
- `GET /api/v1/invocations/*` - Invocation history
- `POST /api/v1/sandbox/{sandbox_id}/access` - Sandbox access tokens
- All auth endpoints (`/api/v1/auth/*`)

**Severity:** High - Users don't know these features exist.

---

### 7. SDK Methods Not Documented

**Location:** https://docs.castari.com/sdk/agents

**Missing SDK methods:**
- `uploadCode(slug, file, filename, options?)` - Upload code directly
- `listSecrets(slug)` - Listed in code but not in docs
- `setSecret(slug, key, value)` - Listed in code but not in docs
- `deleteSecret(slug, key)` - Listed in code but not in docs

**Severity:** High - Users don't know these methods exist.

---

## Medium Severity Issues

### 8. SDK `create()` Parameter Documentation Misleading

**Location:** https://docs.castari.com/sdk/agents

**Documented:**
```typescript
client.agents.create({
  slug: 'my-agent',  // Listed as required
  name: 'My Agent',
})
```

**Actual:**
```typescript
interface CreateAgentOptions {
  name: string;           // REQUIRED
  slug?: string;          // Optional
  description?: string;
  sourceType?: 'git' | 'local';
  gitRepoUrl?: string;
}
```

**Issue:** `name` is actually required, `slug` is optional. Docs have it reversed.

---

### 9. Missing `session` Option in CLI invoke

**Location:** https://docs.castari.com/cli/invoke

**Issue:** The `-s, --session <id>` option exists in the CLI but is not documented anywhere. This is important for multi-turn conversations.

---

### 10. Missing `-i, --input` Option in CLI invoke

**Location:** https://docs.castari.com/cli/invoke

**Issue:** The `-i, --input <file>` option exists for reading prompts from files but is not documented. The docs instead show `--stdin` which doesn't exist.

---

## Low Severity Issues

### 11. Potential API Rate Limit Documentation Mismatch

**Location:** https://docs.castari.com/api-reference/introduction

**Documented:**
- Write operations: 60 requests/minute

**API Code shows:**
- `RATE_LIMIT_CRUD = 100` (for all CRUD operations)

**Issue:** Rate limits may not match documentation.

---

### 12. SDK Type Export Mismatch

**Location:** https://docs.castari.com/sdk/overview

**Documented imports:**
```typescript
import { InvocationResult } from '@castari/sdk';
```

**Actual exports:**
```typescript
export type { InvocationResponse } from './types.js';
// InvocationResult doesn't exist
```

---

### 13. Navigation References Non-Existent Command

**Location:** Navigation sidebar and multiple pages

**Issue:** The sidebar prominently features "cast logs" which doesn't exist. Multiple pages link to `/cli/logs` and reference `cast logs` as a feature.

---

## Recommendations

### Immediate Actions
1. **Remove or stub `cast logs` documentation** - This is the most visible broken documentation
2. **Fix `cast invoke` options** - Document the actual `-i, --input` and `-s, --session` flags
3. **Fix `cast deploy` signature** - Change from `[path]` to `[slug]`
4. **Fix SDK invoke examples** - Update to use `{ prompt: '...' }` object

### Short-term Actions
1. Document missing CLI features (`--session`, `--input`)
2. Update SDK documentation with correct signatures
3. Document missing API endpoints (especially streaming)
4. Fix API authentication header documentation

### Long-term Actions
1. Implement `cast logs` command to match documentation, OR remove documentation entirely
2. Add automated doc-testing to catch drift between code and docs
3. Consider generating SDK/CLI docs from source code annotations

---

## Testing Notes

**CLI Version Tested:** Located at `/Users/jacobwright/Desktop/cli/packages/cli`
**SDK Version Tested:** Located at `/Users/jacobwright/Desktop/cli/packages/sdk`
**API Codebase:** Located at `/Users/jacobwright/Desktop/claude-agent-platform`

---

## Appendix: Verification Commands

```bash
# Verify cast logs doesn't exist
node packages/cli/bin/cast.js logs --help
# Returns: main help (command not found)

# Verify cast invoke actual options
node packages/cli/bin/cast.js invoke --help
# Shows: -i, --input <file>, -s, --session <id>

# Verify cast deploy actual signature
node packages/cli/bin/cast.js deploy --help
# Shows: [slug] argument, no options
```
