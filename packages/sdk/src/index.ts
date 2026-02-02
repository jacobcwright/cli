// Main client
export { CastariClient } from './client.js';

// API classes
export { AgentsAPI } from './agents.js';
export { UsageAPI } from './usage.js';
export { AuthAPI } from './auth.js';
export { StorageAPI } from './storage.js';
export { MountsAPI } from './mounts.js';
export { FilesAPI } from './files.js';

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
  // Storage types
  StorageProvider,
  Bucket,
  BucketListResponse,
  CreateBucketOptions,
  UpdateBucketOptions,
  BucketCredentials,
  TestConnectionResult,
  PresignedUrlOptions,
  PresignedUrl,
  FileInfo,
  FileListResponse,
  // Mount types
  PermissionMode,
  PermissionRule,
  Mount,
  MountListResponse,
  AddMountOptions,
  UpdateMountOptions,
  // Managed Files types (Storage v2)
  FileScope,
  FileUploadStatus,
  ManagedFile,
  FileUploadResponse,
  ManagedFileList,
  StorageUsage,
  PresignedUpload,
  AgentFile,
  AgentFileList,
  AttachFileOptions,
  ListFilesOptions,
  UploadFileOptions,
  UpdateFileOptions,
  GetUploadUrlOptions,
} from './types.js';
