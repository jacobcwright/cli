/**
 * Agent status values
 */
export type AgentStatus = 'draft' | 'pending' | 'deploying' | 'active' | 'stopped' | 'failed';

/**
 * Agent source type
 */
export type AgentSourceType = 'git' | 'local';

/**
 * Agent configuration
 */
export interface AgentConfig {
  model?: string;
  max_turns?: number;
  system_prompt?: string;
}

/**
 * An AI agent on the Castari platform
 */
export interface Agent {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string | null;
  source_type: AgentSourceType;
  git_repo_url?: string | null;
  git_branch: string;
  source_hash?: string | null;
  agent_config?: AgentConfig;
  default_model: string;
  max_turns: number;
  timeout_seconds: number;
  status: AgentStatus;
  status_message?: string | null;
  sandbox_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Response from listing agents
 */
export interface AgentsListResponse {
  agents: Agent[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/**
 * Options for creating an agent
 */
export interface CreateAgentOptions {
  name: string;
  slug?: string;
  description?: string;
  /** Source type: 'git' (default) or 'local' for direct code upload */
  sourceType?: AgentSourceType;
  /** Git repository URL (required when sourceType is 'git') */
  gitRepoUrl?: string;
}

/**
 * Response from uploading code
 */
export interface UploadResponse {
  agent_id: string;
  source_hash: string;
  status: AgentStatus;
  sandbox_id?: string | null;
  message: string;
}

/**
 * Response from invoking an agent
 */
export interface InvocationResponse {
  invocation_id: string;
  session_id: string;
  sandbox_id?: string | null;
  response_content: string;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number | string;
  duration_ms: number;
  status: 'completed' | 'failed';
}

/**
 * Options for invoking an agent
 */
export interface InvokeOptions {
  prompt: string;
  /** Optional session ID for per-session sandbox scaling. Auto-generated if not provided. */
  sessionId?: string;
}

/**
 * A secret key (values are never returned by the API)
 */
export interface Secret {
  key: string;
}

/**
 * The current authenticated user
 */
export interface User {
  id: string;
  email: string;
  api_key_prefix?: string;
  created_at: string;
}

/**
 * Response from creating an API key
 */
export interface ApiKeyResponse {
  api_key: string;
  prefix: string;
}

/**
 * Raw usage summary from API
 */
export interface UsageSummaryResponse {
  total_invocations: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: string;
  period_start: string;
  period_end: string;
}

/**
 * Usage summary for a period
 */
export interface UsageSummary {
  total_invocations: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  period_start: string;
  period_end: string;
}

/**
 * Raw daily usage from API
 */
export interface DailyUsageResponse {
  daily_usage: Array<{
    date: string;
    invocation_count: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: string;
  }>;
  total_days: number;
}

/**
 * Daily usage breakdown
 */
export interface DailyUsage {
  date: string;
  invocation_count: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

/**
 * Client configuration options
 */
export interface CastariClientOptions {
  /** API key (starts with cap_) */
  apiKey?: string;
  /** OAuth token */
  token?: string;
  /** Base API URL (default: https://api.castari.com) */
  baseUrl?: string;
}

/**
 * API error response format
 */
export interface ApiErrorResponse {
  detail: string;
  code?: string;
}
