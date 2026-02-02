import type { HttpClient } from './http.js';
import type {
  ManagedFile,
  ManagedFileList,
  FileUploadResponse,
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

/**
 * API for managing files in Castari storage (Storage v2)
 */
export class FilesAPI {
  constructor(private client: HttpClient) {}

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * List files in managed storage
   * @param options - Filtering and pagination options
   * @returns List of files with pagination metadata
   */
  async list(options?: ListFilesOptions): Promise<ManagedFileList> {
    const query: Record<string, string | number | undefined> = {};

    if (options?.limit !== undefined) {
      query.limit = options.limit;
    }
    if (options?.offset !== undefined) {
      query.offset = options.offset;
    }
    if (options?.scope) {
      query.scope = options.scope;
    }
    if (options?.tags) {
      query.tags = options.tags;
    }
    if (options?.search) {
      query.search = options.search;
    }

    return this.client.request<ManagedFileList>('GET', '/files', { query });
  }

  /**
   * Get a file by ID
   * @param fileId - The file's unique ID
   * @returns The file metadata
   * @throws NotFoundError if file doesn't exist
   */
  async get(fileId: string): Promise<ManagedFile> {
    return this.client.request<ManagedFile>(
      'GET',
      `/files/${encodeURIComponent(fileId)}`
    );
  }

  /**
   * Upload a file to managed storage
   * @param file - The file data as Blob
   * @param filename - The filename
   * @param options - Upload options (description, tags)
   * @returns The uploaded file metadata
   */
  async upload(
    file: Blob,
    filename: string,
    options?: UploadFileOptions
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file, filename);

    if (options?.description) {
      formData.append('description', options.description);
    }
    if (options?.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    return this.client.requestMultipart<FileUploadResponse>(
      'POST',
      '/files',
      formData,
      { timeout: 300000 } // 5 minute timeout for uploads
    );
  }

  /**
   * Update file metadata
   * @param fileId - The file's unique ID
   * @param options - Update options (description, tags)
   * @returns The updated file metadata
   */
  async update(fileId: string, options: UpdateFileOptions): Promise<ManagedFile> {
    const body: Record<string, unknown> = {};

    if (options.description !== undefined) {
      body.description = options.description;
    }
    if (options.tags !== undefined) {
      body.tags = options.tags;
    }

    return this.client.request<ManagedFile>(
      'PATCH',
      `/files/${encodeURIComponent(fileId)}`,
      { body }
    );
  }

  /**
   * Delete a file
   * @param fileId - The file's unique ID
   * @throws NotFoundError if file doesn't exist
   */
  async delete(fileId: string): Promise<void> {
    return this.client.request<void>(
      'DELETE',
      `/files/${encodeURIComponent(fileId)}`
    );
  }

  /**
   * Get download URL for a file
   * @param fileId - The file's unique ID
   * @returns The download URL (redirect URL)
   */
  async getDownloadUrl(fileId: string): Promise<string> {
    // The API returns a redirect, so we get the content endpoint URL
    const baseUrl = '/files/' + encodeURIComponent(fileId) + '/content';
    // Return the full URL - caller can use this directly or fetch it
    return baseUrl;
  }

  /**
   * Get storage usage statistics
   * @returns Storage usage stats including quota information
   */
  async getUsage(): Promise<StorageUsage> {
    return this.client.request<StorageUsage>('GET', '/files/usage');
  }

  // ============================================================================
  // Presigned Upload Flow (for large files)
  // ============================================================================

  /**
   * Get a presigned URL for uploading a file
   * @param filename - The filename to upload
   * @param sizeBytes - The file size in bytes
   * @param options - Additional options (contentType, description, tags)
   * @returns Presigned upload URL and file ID
   */
  async getUploadUrl(
    filename: string,
    sizeBytes: number,
    options?: GetUploadUrlOptions
  ): Promise<PresignedUpload> {
    const body: Record<string, unknown> = {
      filename,
      size_bytes: sizeBytes,
    };

    if (options?.contentType) {
      body.content_type = options.contentType;
    }
    if (options?.description) {
      body.description = options.description;
    }
    if (options?.tags && options.tags.length > 0) {
      body.tags = options.tags;
    }

    return this.client.request<PresignedUpload>('POST', '/files/upload-url', {
      body,
    });
  }

  /**
   * Confirm a presigned upload after uploading to the presigned URL
   * @param fileId - The file ID from getUploadUrl
   * @param sha256Hash - The SHA256 hash of the uploaded file
   * @returns The confirmed file metadata
   */
  async confirmUpload(fileId: string, sha256Hash: string): Promise<ManagedFile> {
    return this.client.request<ManagedFile>('POST', '/files/confirm-upload', {
      body: {
        file_id: fileId,
        sha256_hash: sha256Hash,
      },
    });
  }

  // ============================================================================
  // Agent File Operations
  // ============================================================================

  /**
   * List files attached to an agent
   * @param agentSlug - The agent's unique slug
   * @returns List of attached files with total size
   */
  async listAgentFiles(agentSlug: string): Promise<AgentFileList> {
    return this.client.request<AgentFileList>(
      'GET',
      `/agents/${encodeURIComponent(agentSlug)}/files`
    );
  }

  /**
   * Attach a file to an agent
   * @param agentSlug - The agent's unique slug
   * @param options - Attachment options (fileId, mountPath, readOnly)
   * @returns The attached file details
   */
  async attachToAgent(
    agentSlug: string,
    options: AttachFileOptions
  ): Promise<AgentFile> {
    const body: Record<string, unknown> = {
      file_id: options.fileId,
    };

    if (options.mountPath !== undefined) {
      body.mount_path = options.mountPath;
    }
    if (options.readOnly !== undefined) {
      body.read_only = options.readOnly;
    }

    return this.client.request<AgentFile>(
      'POST',
      `/agents/${encodeURIComponent(agentSlug)}/files`,
      { body }
    );
  }

  /**
   * Detach a file from an agent
   * @param agentSlug - The agent's unique slug
   * @param fileId - The file's unique ID
   */
  async detachFromAgent(agentSlug: string, fileId: string): Promise<void> {
    return this.client.request<void>(
      'DELETE',
      `/agents/${encodeURIComponent(agentSlug)}/files/${encodeURIComponent(fileId)}`
    );
  }
}
