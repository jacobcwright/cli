import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { CastariClient } from '@castari/sdk';
import { success, info, hint, blank, formatNumber } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Format file size in human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format date for file listing
 */
function formatFileDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * cast files list <bucket-slug> [prefix]
 */
const listCommand = new Command('list')
  .description('List files in a bucket')
  .argument('<bucket-slug>', 'Bucket slug')
  .argument('[prefix]', 'Optional prefix to filter files')
  .action(async (bucketSlug: string, prefix?: string) => {
    const spinner = ora('Listing files...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const files = await client.storage.listFiles(bucketSlug, prefix);

      spinner.stop();

      if (files.length === 0) {
        info('No files found');
        if (prefix) {
          hint(`Try listing without prefix: cast files list ${bucketSlug}`);
        }
        return;
      }

      const table = new Table({
        head: [
          chalk.white('Path'),
          chalk.white('Size'),
          chalk.white('Modified'),
        ],
        style: {
          head: [],
          border: [],
        },
        colWidths: [50, 12, 24],
      });

      for (const file of files) {
        table.push([
          file.is_directory ? chalk.blue(file.path + '/') : file.path,
          file.is_directory ? chalk.gray('-') : formatSize(file.size),
          formatFileDate(file.last_modified),
        ]);
      }

      console.log(table.toString());
      blank();
      info(`${formatNumber(files.length)} file${files.length === 1 ? '' : 's'} found`);
    } catch (err) {
      spinner.fail('Failed to list files');
      handleError(err);
    }
  });

/**
 * cast files upload <bucket-slug> <local-path>
 */
const uploadCommand = new Command('upload')
  .description('Upload a file to a bucket')
  .argument('<bucket-slug>', 'Bucket slug')
  .argument('<local-path>', 'Local file path')
  .option('--remote-path <path>', 'Remote path in bucket (default: filename)')
  .action(
    async (
      bucketSlug: string,
      localPath: string,
      options: { remotePath?: string }
    ) => {
      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        // Check if file exists and get size
        let fileStats;
        try {
          fileStats = await stat(localPath);
        } catch {
          handleError(new Error(`File not found: ${localPath}`));
        }

        if (!fileStats!.isFile()) {
          handleError(new Error(`Not a file: ${localPath}`));
        }

        const remotePath = options.remotePath || basename(localPath);
        const spinner = ora(`Uploading ${basename(localPath)} (${formatSize(fileStats!.size)})...`).start();

        // Get presigned upload URL
        const { url } = await client.storage.getUploadUrl(bucketSlug, remotePath);

        // Upload file using fetch with stream
        const fileStream = createReadStream(localPath);
        const chunks: Buffer[] = [];

        for await (const chunk of fileStream) {
          chunks.push(Buffer.from(chunk));
        }

        const fileBuffer = Buffer.concat(chunks);

        const response = await fetch(url, {
          method: 'PUT',
          body: fileBuffer,
          headers: {
            'Content-Length': fileStats!.size.toString(),
          },
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        spinner.succeed(`Uploaded to ${remotePath}`);
        info(`Size: ${formatSize(fileStats!.size)}`);
      } catch (err) {
        handleError(err);
      }
    }
  );

/**
 * cast files download <bucket-slug> <remote-path>
 */
const downloadCommand = new Command('download')
  .description('Download a file from a bucket')
  .argument('<bucket-slug>', 'Bucket slug')
  .argument('<remote-path>', 'Remote file path')
  .option('--output <path>', 'Output file path (default: filename)')
  .action(
    async (
      bucketSlug: string,
      remotePath: string,
      options: { output?: string }
    ) => {
      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        const outputPath = options.output || basename(remotePath);
        const spinner = ora(`Downloading ${basename(remotePath)}...`).start();

        // Get presigned download URL
        const { url } = await client.storage.getDownloadUrl(bucketSlug, remotePath);

        // Download file
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        // Write to file
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await new Promise<void>((resolve, reject) => {
          const writeStream = createWriteStream(outputPath);
          writeStream.write(buffer);
          writeStream.end();
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        spinner.succeed(`Downloaded to ${outputPath}`);
        info(`Size: ${formatSize(buffer.length)}`);
      } catch (err) {
        handleError(err);
      }
    }
  );

/**
 * cast files sync <agent-slug>
 */
const syncCommand = new Command('sync')
  .description('Force sync mounts for a running agent')
  .argument('<agent-slug>', 'Agent slug')
  .action(async (agentSlug: string) => {
    const spinner = ora('Syncing mounts...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      await client.mounts.syncMounts(agentSlug);

      spinner.succeed(`Mounts synced for agent '${agentSlug}'`);
    } catch (err) {
      spinner.fail('Failed to sync mounts');
      handleError(err);
    }
  });

/**
 * cast files
 */
export const filesCommand = new Command('files')
  .description('Manage bucket files')
  .addCommand(listCommand)
  .addCommand(uploadCommand)
  .addCommand(downloadCommand)
  .addCommand(syncCommand);
