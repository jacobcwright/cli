import type { HttpClient } from './http.js';
import type {
  Bucket,
  BucketListResponse,
  CreateBucketOptions,
  UpdateBucketOptions,
  BucketCredentials,
  TestConnectionResult,
  PresignedUrl,
  PresignedUrlOptions,
  FileInfo,
  FileListResponse,
} from './types.js';

/**
 * API for managing storage buckets
 */
export class StorageAPI {
  constructor(private client: HttpClient) {}

  /**
   * Create a new storage bucket
   * @param options - Bucket creation options
   * @returns The created bucket
   */
  async createBucket(options: CreateBucketOptions): Promise<Bucket> {
    const body: Record<string, unknown> = {
      name: options.name,
      slug: options.slug,
      provider: options.provider,
      bucket_name: options.bucketName,
    };

    if (options.region) {
      body.region = options.region;
    }
    if (options.endpointUrl) {
      body.endpoint_url = options.endpointUrl;
    }

    return this.client.request<Bucket>('POST', '/buckets', { body });
  }

  /**
   * List all buckets for the authenticated user
   * @returns Array of buckets
   */
  async getBuckets(): Promise<Bucket[]> {
    const response = await this.client.request<BucketListResponse>('GET', '/buckets');
    return response.buckets;
  }

  /**
   * Get a bucket by slug
   * @param slug - The bucket's unique slug
   * @returns The bucket
   * @throws NotFoundError if bucket doesn't exist
   */
  async getBucket(slug: string): Promise<Bucket> {
    return this.client.request<Bucket>('GET', `/buckets/${encodeURIComponent(slug)}`);
  }

  /**
   * Update a bucket
   * @param slug - The bucket's unique slug
   * @param options - Update options
   * @returns The updated bucket
   */
  async updateBucket(slug: string, options: UpdateBucketOptions): Promise<Bucket> {
    const body: Record<string, unknown> = {};

    if (options.name !== undefined) {
      body.name = options.name;
    }
    if (options.bucketName !== undefined) {
      body.bucket_name = options.bucketName;
    }
    if (options.region !== undefined) {
      body.region = options.region;
    }
    if (options.endpointUrl !== undefined) {
      body.endpoint_url = options.endpointUrl;
    }

    return this.client.request<Bucket>('PATCH', `/buckets/${encodeURIComponent(slug)}`, { body });
  }

  /**
   * Delete a bucket
   * @param slug - The bucket's unique slug
   * @throws NotFoundError if bucket doesn't exist
   */
  async deleteBucket(slug: string): Promise<void> {
    return this.client.request<void>('DELETE', `/buckets/${encodeURIComponent(slug)}`);
  }

  /**
   * Set credentials for a bucket
   * @param slug - The bucket's unique slug
   * @param credentials - The credentials to set
   */
  async setCredentials(slug: string, credentials: BucketCredentials): Promise<void> {
    const body: Record<string, unknown> = {};

    if (credentials.accessKeyId) {
      body.access_key_id = credentials.accessKeyId;
    }
    if (credentials.secretAccessKey) {
      body.secret_access_key = credentials.secretAccessKey;
    }
    if (credentials.serviceAccountJson) {
      body.service_account_json = credentials.serviceAccountJson;
    }

    return this.client.request<void>('POST', `/buckets/${encodeURIComponent(slug)}/credentials`, {
      body,
    });
  }

  /**
   * Delete credentials for a bucket
   * @param slug - The bucket's unique slug
   */
  async deleteCredentials(slug: string): Promise<void> {
    return this.client.request<void>('DELETE', `/buckets/${encodeURIComponent(slug)}/credentials`);
  }

  /**
   * Test bucket connection with stored credentials
   * @param slug - The bucket's unique slug
   * @returns Test connection result
   */
  async testConnection(slug: string): Promise<TestConnectionResult> {
    return this.client.request<TestConnectionResult>(
      'POST',
      `/buckets/${encodeURIComponent(slug)}/test`
    );
  }

  /**
   * Get a presigned URL for uploading a file
   * @param slug - The bucket's unique slug
   * @param path - Path within the bucket
   * @param options - URL options
   * @returns Presigned URL for upload
   */
  async getUploadUrl(
    slug: string,
    path: string,
    options?: PresignedUrlOptions
  ): Promise<PresignedUrl> {
    return this.client.request<PresignedUrl>(
      'POST',
      `/buckets/${encodeURIComponent(slug)}/upload-url`,
      {
        body: {
          path,
          expires_in: options?.expiresIn ?? 3600,
        },
      }
    );
  }

  /**
   * Get a presigned URL for downloading a file
   * @param slug - The bucket's unique slug
   * @param path - Path within the bucket
   * @param options - URL options
   * @returns Presigned URL for download
   */
  async getDownloadUrl(
    slug: string,
    path: string,
    options?: PresignedUrlOptions
  ): Promise<PresignedUrl> {
    return this.client.request<PresignedUrl>(
      'POST',
      `/buckets/${encodeURIComponent(slug)}/download-url`,
      {
        body: {
          path,
          expires_in: options?.expiresIn ?? 3600,
        },
      }
    );
  }

  /**
   * List files in a bucket
   * @param slug - The bucket's unique slug
   * @param prefix - Optional prefix to filter files
   * @returns Array of file info
   */
  async listFiles(slug: string, prefix?: string): Promise<FileInfo[]> {
    const query: Record<string, string | undefined> = {};
    if (prefix) {
      query.prefix = prefix;
    }

    const response = await this.client.request<FileListResponse>(
      'GET',
      `/buckets/${encodeURIComponent(slug)}/files`,
      { query }
    );
    return response.files;
  }
}
