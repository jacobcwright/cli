// Main client
export { CastariClient } from './client.js';

// API classes
export { AgentsAPI } from './agents.js';
export { UsageAPI } from './usage.js';
export { AuthAPI } from './auth.js';

// Errors
export {
  CastariError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  BadRequestError,
  ServerError,
} from './errors.js';

// Config utilities
export {
  loadCredentials,
  saveCredentials,
  clearCredentials,
  loadConfig,
  saveConfig,
  getApiUrl,
  getAuth,
  type Credentials,
  type Config,
} from './config.js';

// Types
export type {
  Agent,
  AgentConfig,
  AgentsListResponse,
  AgentSourceType,
  AgentStatus,
  ApiKeyResponse,
  CreateAgentOptions,
  InvocationResponse,
  InvokeOptions,
  Secret,
  UploadResponse,
  User,
  UsageSummary,
  UsageSummaryResponse,
  DailyUsage,
  DailyUsageResponse,
  CastariClientOptions,
  ApiErrorResponse,
} from './types.js';
