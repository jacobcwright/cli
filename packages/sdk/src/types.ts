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

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage provider types
 */
export type StorageProvider = 's3' | 'gcs' | 'r2';

/**
 * A storage bucket configuration
 */
export interface Bucket {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  provider: StorageProvider;
  bucket_name: string;
  region?: string | null;
  endpoint_url?: string | null;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Response from listing buckets
 */
export interface BucketListResponse {
  buckets: Bucket[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/**
 * Options for creating a bucket
 */
export interface CreateBucketOptions {
  name: string;
  slug: string;
  provider: StorageProvider;
  bucketName: string;
  region?: string;
  endpointUrl?: string;
}

/**
 * Options for updating a bucket
 */
export interface UpdateBucketOptions {
  name?: string;
  bucketName?: string;
  region?: string;
  endpointUrl?: string;
}

/**
 * Bucket credentials
 */
export interface BucketCredentials {
  /** S3/R2 access key ID */
  accessKeyId?: string;
  /** S3/R2 secret access key */
  secretAccessKey?: string;
  /** GCS service account JSON */
  serviceAccountJson?: string;
}

/**
 * Result from testing bucket connection
 */
export interface TestConnectionResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

/**
 * Options for presigned URLs
 */
export interface PresignedUrlOptions {
  /** Expiration time in seconds (default: 3600) */
  expiresIn?: number;
}

/**
 * Presigned URL response
 */
export interface PresignedUrl {
  url: string;
  expires_at: string;
  method: 'GET' | 'PUT';
}

/**
 * File information
 */
export interface FileInfo {
  path: string;
  size: number;
  last_modified: string;
  is_directory: boolean;
}

/**
 * Response from listing files
 */
export interface FileListResponse {
  files: FileInfo[];
  prefix?: string;
  truncated: boolean;
}

// ============================================================================
// Mount Types
// ============================================================================

/**
 * Permission mode for mount paths
 */
export type PermissionMode = 'ro' | 'rw';

/**
 * Permission rule for a mount path
 */
export interface PermissionRule {
  path: string;
  mode: PermissionMode;
}

/**
 * A bucket mount configuration
 */
export interface Mount {
  id: string;
  bucket_id: string;
  agent_id: string;
  bucket: Bucket;
  mount_path: string;
  source_prefix: string;
  permission_rules: PermissionRule[];
  cache_enabled: boolean;
  cache_ttl_seconds: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Response from listing mounts
 */
export interface MountListResponse {
  mounts: Mount[];
}

/**
 * Options for adding a mount
 */
export interface AddMountOptions {
  bucketSlug: string;
  mountPath: string;
  sourcePrefix?: string;
  permissionRules?: PermissionRule[];
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
}

/**
 * Options for updating a mount
 */
export interface UpdateMountOptions {
  mountPath?: string;
  sourcePrefix?: string;
  permissionRules?: PermissionRule[];
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
  enabled?: boolean;
}

// ============================================================================
// Managed Files Types (Storage v2)
// ============================================================================

/**
 * File scope for managed storage
 */
export type FileScope = 'user' | 'agent' | 'session';

/**
 * File upload status
 */
export type FileUploadStatus = 'pending' | 'confirmed';

/**
 * A managed file in Castari storage
 */
export interface ManagedFile {
  id: string;
  file_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  sha256_hash: string;
  scope: FileScope;
  scope_id: string | null;
  description: string | null;
  tags: string[];
  upload_status: FileUploadStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Response from uploading a file
 */
export interface FileUploadResponse {
  file_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  sha256_hash: string;
  created_at: string;
}

/**
 * Response from listing managed files
 */
export interface ManagedFileList {
  files: ManagedFile[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/**
 * Storage usage statistics
 */
export interface StorageUsage {
  total_files: number;
  total_bytes: number;
  total_mb: number;
  limit_mb: number;
  usage_percent: number;
}

/**
 * Presigned upload URL response
 */
export interface PresignedUpload {
  file_id: string;
  upload_url: string;
  upload_method: 'PUT';
  upload_headers: Record<string, string>;
  expires_at: string;
}

/**
 * A file attached to an agent
 */
export interface AgentFile {
  id: string;
  file_id: string;
  filename: string;
  mount_path: string;
  read_only: boolean;
  size_bytes: number;
  created_at: string;
}

/**
 * Response from listing agent files
 */
export interface AgentFileList {
  files: AgentFile[];
  total_size_bytes: number;
}

/**
 * Options for attaching a file to an agent
 */
export interface AttachFileOptions {
  fileId: string;
  mountPath?: string;
  readOnly?: boolean;
}

/**
 * Options for listing managed files
 */
export interface ListFilesOptions {
  limit?: number;
  offset?: number;
  scope?: FileScope;
  tags?: string;
  search?: string;
}

/**
 * Options for uploading a file
 */
export interface UploadFileOptions {
  description?: string;
  tags?: string[];
}

/**
 * Options for updating a file
 */
export interface UpdateFileOptions {
  description?: string;
  tags?: string[];
}

/**
 * Options for getting a presigned upload URL
 */
export interface GetUploadUrlOptions {
  contentType?: string;
  description?: string;
  tags?: string[];
}
