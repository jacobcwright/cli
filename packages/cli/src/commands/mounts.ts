import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import prompts from 'prompts';
import { CastariClient } from '@castari/sdk';
import { success, info, hint, blank, keyValue, formatDate } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Format enabled status with color
 */
function formatEnabled(enabled: boolean): string {
  return enabled ? chalk.green('Enabled') : chalk.gray('Disabled');
}

/**
 * Format permission rules
 */
function formatPermissions(rules: Array<{ path: string; mode: string }>): string {
  if (rules.length === 0) {
    return chalk.gray('rw (default)');
  }
  return rules.map((r) => `${r.path}:${r.mode}`).join(', ');
}

/**
 * cast mounts list <agent-slug>
 */
const listCommand = new Command('list')
  .description('List mounts for an agent')
  .argument('<agent-slug>', 'Agent slug')
  .action(async (agentSlug: string) => {
    const spinner = ora('Fetching mounts...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const mounts = await client.mounts.getMounts(agentSlug);

      spinner.stop();

      if (mounts.length === 0) {
        info(`No mounts configured for agent '${agentSlug}'`);
        hint(`Add one with: cast mounts add ${agentSlug}`);
        return;
      }

      const table = new Table({
        head: [
          chalk.white('ID'),
          chalk.white('Bucket'),
          chalk.white('Mount Path'),
          chalk.white('Prefix'),
          chalk.white('Status'),
        ],
        style: {
          head: [],
          border: [],
        },
      });

      for (const mount of mounts) {
        table.push([
          mount.id.substring(0, 8),
          mount.bucket.slug,
          mount.mount_path,
          mount.source_prefix || chalk.gray('-'),
          formatEnabled(mount.enabled),
        ]);
      }

      console.log(table.toString());
    } catch (err) {
      spinner.fail('Failed to list mounts');
      handleError(err);
    }
  });

/**
 * cast mounts add <agent-slug>
 */
const addCommand = new Command('add')
  .description('Add a mount to an agent')
  .argument('<agent-slug>', 'Agent slug')
  .option('--bucket <bucket-slug>', 'Bucket to mount')
  .option('--path <mount-path>', 'Mount path (e.g., /data)')
  .option('--prefix <source-prefix>', 'Source prefix in bucket')
  .option('--read-only', 'Make the mount read-only')
  .action(
    async (
      agentSlug: string,
      options: {
        bucket?: string;
        path?: string;
        prefix?: string;
        readOnly?: boolean;
      }
    ) => {
      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        let bucketSlug = options.bucket;
        let mountPath = options.path;
        let sourcePrefix = options.prefix;

        // Interactive mode if bucket or path not provided
        if (!bucketSlug || !mountPath) {
          // Fetch available buckets for selection
          const buckets = await client.storage.getBuckets();

          if (buckets.length === 0) {
            info('No buckets available');
            hint('Create one with: cast buckets create <name>');
            return;
          }

          const responses = await prompts([
            {
              type: bucketSlug ? null : 'select',
              name: 'bucket',
              message: 'Select bucket to mount',
              choices: buckets.map((b) => ({
                title: `${b.name} (${b.slug})`,
                value: b.slug,
              })),
            },
            {
              type: mountPath ? null : 'text',
              name: 'path',
              message: 'Mount path (e.g., /data)',
              initial: '/data',
              validate: (value) => (value.startsWith('/') ? true : 'Mount path must start with /'),
            },
            {
              type: sourcePrefix !== undefined ? null : 'text',
              name: 'prefix',
              message: 'Source prefix in bucket (optional)',
              initial: '',
            },
          ]);

          if ((!responses.bucket && !bucketSlug) || (!responses.path && !mountPath)) {
            info('Mount creation cancelled');
            return;
          }

          bucketSlug = bucketSlug || responses.bucket;
          mountPath = mountPath || responses.path;
          sourcePrefix = sourcePrefix !== undefined ? sourcePrefix : responses.prefix;
        }

        const spinner = ora('Adding mount...').start();

        const mount = await client.mounts.addMount(agentSlug, {
          bucketSlug: bucketSlug!,
          mountPath: mountPath!,
          sourcePrefix: sourcePrefix || undefined,
          permissionRules: options.readOnly ? [{ path: '/', mode: 'ro' }] : undefined,
        });

        spinner.succeed(`Mount added to agent '${agentSlug}'`);
        blank();
        keyValue('Mount ID', mount.id.substring(0, 8));
        keyValue('Bucket', mount.bucket.slug);
        keyValue('Mount Path', mount.mount_path);
        keyValue('Source Prefix', mount.source_prefix || '-');
        keyValue('Permissions', formatPermissions(mount.permission_rules));
        blank();
        hint('Redeploy the agent to apply changes');
      } catch (err) {
        handleError(err);
      }
    }
  );

/**
 * cast mounts remove <agent-slug> <mount-id>
 */
const removeCommand = new Command('remove')
  .description('Remove a mount from an agent')
  .argument('<agent-slug>', 'Agent slug')
  .argument('<mount-id>', 'Mount ID (or prefix)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (agentSlug: string, mountId: string, options: { force?: boolean }) => {
    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      // Find the full mount ID if a prefix was provided
      const mounts = await client.mounts.getMounts(agentSlug);
      const mount = mounts.find((m) => m.id.startsWith(mountId));

      if (!mount) {
        handleError(new Error(`Mount '${mountId}' not found for agent '${agentSlug}'`));
      }

      // Confirm deletion unless --force is used
      if (!options.force) {
        const response = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `Remove mount at '${mount!.mount_path}' from agent '${agentSlug}'?`,
          initial: false,
        });

        if (!response.confirm) {
          info('Removal cancelled');
          return;
        }
      }

      const spinner = ora('Removing mount...').start();

      await client.mounts.removeMount(agentSlug, mount!.id);
      spinner.succeed(`Mount removed from agent '${agentSlug}'`);
      hint('Redeploy the agent to apply changes');
    } catch (err) {
      handleError(err);
    }
  });

/**
 * cast mounts update <agent-slug> <mount-id>
 */
const updateCommand = new Command('update')
  .description('Update a mount configuration')
  .argument('<agent-slug>', 'Agent slug')
  .argument('<mount-id>', 'Mount ID (or prefix)')
  .option('--path <mount-path>', 'New mount path')
  .option('--prefix <source-prefix>', 'New source prefix')
  .option('--enable', 'Enable the mount')
  .option('--disable', 'Disable the mount')
  .action(
    async (
      agentSlug: string,
      mountId: string,
      options: {
        path?: string;
        prefix?: string;
        enable?: boolean;
        disable?: boolean;
      }
    ) => {
      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        // Find the full mount ID if a prefix was provided
        const mounts = await client.mounts.getMounts(agentSlug);
        const mount = mounts.find((m) => m.id.startsWith(mountId));

        if (!mount) {
          handleError(new Error(`Mount '${mountId}' not found for agent '${agentSlug}'`));
        }

        // Determine enabled state
        let enabled: boolean | undefined;
        if (options.enable) {
          enabled = true;
        } else if (options.disable) {
          enabled = false;
        }

        // Check if any updates were specified
        if (!options.path && options.prefix === undefined && enabled === undefined) {
          info('No updates specified');
          hint('Use --path, --prefix, --enable, or --disable to update the mount');
          return;
        }

        const spinner = ora('Updating mount...').start();

        const updated = await client.mounts.updateMount(agentSlug, mount!.id, {
          mountPath: options.path,
          sourcePrefix: options.prefix,
          enabled,
        });

        spinner.succeed(`Mount updated`);
        blank();
        keyValue('Mount Path', updated.mount_path);
        keyValue('Source Prefix', updated.source_prefix || '-');
        keyValue('Status', formatEnabled(updated.enabled));
        blank();
        hint('Redeploy the agent to apply changes');
      } catch (err) {
        handleError(err);
      }
    }
  );

/**
 * cast mounts
 */
export const mountsCommand = new Command('mounts')
  .description('Manage agent storage mounts')
  .addCommand(listCommand)
  .addCommand(addCommand)
  .addCommand(removeCommand)
  .addCommand(updateCommand);
