import type { HttpClient } from './http.js';
import type {
  Mount,
  MountListResponse,
  AddMountOptions,
  UpdateMountOptions,
} from './types.js';

/**
 * API for managing agent mounts
 */
export class MountsAPI {
  constructor(private client: HttpClient) {}

  /**
   * List all mounts for an agent
   * @param agentSlug - The agent's unique slug
   * @returns Array of mounts
   */
  async getMounts(agentSlug: string): Promise<Mount[]> {
    const response = await this.client.request<MountListResponse>(
      'GET',
      `/agents/${encodeURIComponent(agentSlug)}/mounts`
    );
    return response.mounts;
  }

  /**
   * Get a specific mount
   * @param agentSlug - The agent's unique slug
   * @param mountId - The mount's ID
   * @returns The mount
   */
  async getMount(agentSlug: string, mountId: string): Promise<Mount> {
    return this.client.request<Mount>(
      'GET',
      `/agents/${encodeURIComponent(agentSlug)}/mounts/${encodeURIComponent(mountId)}`
    );
  }

  /**
   * Add a mount to an agent
   * @param agentSlug - The agent's unique slug
   * @param options - Mount options
   * @returns The created mount
   */
  async addMount(agentSlug: string, options: AddMountOptions): Promise<Mount> {
    const body: Record<string, unknown> = {
      bucket_slug: options.bucketSlug,
      mount_path: options.mountPath,
    };

    if (options.sourcePrefix !== undefined) {
      body.source_prefix = options.sourcePrefix;
    }
    if (options.permissionRules !== undefined) {
      body.permission_rules = options.permissionRules;
    }
    if (options.cacheEnabled !== undefined) {
      body.cache_enabled = options.cacheEnabled;
    }
    if (options.cacheTtlSeconds !== undefined) {
      body.cache_ttl_seconds = options.cacheTtlSeconds;
    }

    return this.client.request<Mount>(
      'POST',
      `/agents/${encodeURIComponent(agentSlug)}/mounts`,
      { body }
    );
  }

  /**
   * Update a mount
   * @param agentSlug - The agent's unique slug
   * @param mountId - The mount's ID
   * @param options - Update options
   * @returns The updated mount
   */
  async updateMount(
    agentSlug: string,
    mountId: string,
    options: UpdateMountOptions
  ): Promise<Mount> {
    const body: Record<string, unknown> = {};

    if (options.mountPath !== undefined) {
      body.mount_path = options.mountPath;
    }
    if (options.sourcePrefix !== undefined) {
      body.source_prefix = options.sourcePrefix;
    }
    if (options.permissionRules !== undefined) {
      body.permission_rules = options.permissionRules;
    }
    if (options.cacheEnabled !== undefined) {
      body.cache_enabled = options.cacheEnabled;
    }
    if (options.cacheTtlSeconds !== undefined) {
      body.cache_ttl_seconds = options.cacheTtlSeconds;
    }
    if (options.enabled !== undefined) {
      body.enabled = options.enabled;
    }

    return this.client.request<Mount>(
      'PATCH',
      `/agents/${encodeURIComponent(agentSlug)}/mounts/${encodeURIComponent(mountId)}`,
      { body }
    );
  }

  /**
   * Remove a mount from an agent
   * @param agentSlug - The agent's unique slug
   * @param mountId - The mount's ID
   */
  async removeMount(agentSlug: string, mountId: string): Promise<void> {
    return this.client.request<void>(
      'DELETE',
      `/agents/${encodeURIComponent(agentSlug)}/mounts/${encodeURIComponent(mountId)}`
    );
  }

  /**
   * Force sync mounts for a running agent
   * @param agentSlug - The agent's unique slug
   */
  async syncMounts(agentSlug: string): Promise<void> {
    return this.client.request<void>(
      'POST',
      `/agents/${encodeURIComponent(agentSlug)}/files/sync`
    );
  }
}
