import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { CastariClient } from '@castari/sdk';
import { success, info, hint, blank, keyValue, formatNumber } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

// Threshold for using presigned upload (10MB)
const PRESIGNED_UPLOAD_THRESHOLD = 10 * 1024 * 1024;

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
 * Format scope with color
 */
function formatScope(scope: string): string {
  switch (scope) {
    case 'user':
      return chalk.blue(scope);
    case 'agent':
      return chalk.green(scope);
    case 'session':
      return chalk.yellow(scope);
    default:
      return scope;
  }
}

/**
 * Format upload status with color
 */
function formatUploadStatus(status: string): string {
  switch (status) {
    case 'confirmed':
      return chalk.green(status);
    case 'pending':
      return chalk.yellow(status);
    default:
      return status;
  }
}

/**
 * Calculate SHA256 hash of a buffer
 */
function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * cast files list
 */
const listCommand = new Command('list')
  .description('List files in managed storage')
  .option('--limit <n>', 'Maximum number of files to return', '50')
  .option('--offset <n>', 'Number of files to skip', '0')
  .option('--scope <scope>', 'Filter by scope (user, agent, session)')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--search <query>', 'Search in filename and description')
  .action(
    async (options: {
      limit: string;
      offset: string;
      scope?: string;
      tags?: string;
      search?: string;
    }) => {
      const spinner = ora('Listing files...').start();

      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        const result = await client.files.list({
          limit: parseInt(options.limit, 10),
          offset: parseInt(options.offset, 10),
          scope: options.scope as 'user' | 'agent' | 'session' | undefined,
          tags: options.tags,
          search: options.search,
        });

        spinner.stop();

        if (result.files.length === 0) {
          info('No files found');
          hint("Upload a file with: cast files upload <path>");
          return;
        }

        const table = new Table({
          head: [
            chalk.white('File ID'),
            chalk.white('Filename'),
            chalk.white('Size'),
            chalk.white('Scope'),
            chalk.white('Created'),
          ],
          style: {
            head: [],
            border: [],
          },
          colWidths: [24, 30, 12, 10, 20],
        });

        for (const file of result.files) {
          table.push([
            file.file_id,
            file.filename.length > 28
              ? file.filename.substring(0, 25) + '...'
              : file.filename,
            formatSize(file.size_bytes),
            formatScope(file.scope),
            formatFileDate(file.created_at),
          ]);
        }

        console.log(table.toString());
        blank();
        info(
          `Showing ${result.files.length} of ${formatNumber(result.meta.total)} file${result.meta.total === 1 ? '' : 's'}`
        );
        if (result.meta.has_more) {
          hint(
            `Use --offset ${result.meta.offset + result.meta.limit} to see more`
          );
        }
      } catch (err) {
        spinner.fail('Failed to list files');
        handleError(err);
      }
    }
  );

/**
 * cast files upload <path>
 */
const uploadCommand = new Command('upload')
  .description('Upload a file to managed storage')
  .argument('<path>', 'Local file path')
  .option('--description <desc>', 'File description')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(
    async (
      localPath: string,
      options: { description?: string; tags?: string }
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

        const filename = basename(localPath);
        const fileSize = fileStats!.size;
        const tags = options.tags?.split(',').map((t) => t.trim()) || [];

        const spinner = ora(
          `Uploading ${filename} (${formatSize(fileSize)})...`
        ).start();

        let result;

        if (fileSize > PRESIGNED_UPLOAD_THRESHOLD) {
          // Use presigned upload for large files
          spinner.text = `Getting upload URL for ${filename}...`;

          const presigned = await client.files.getUploadUrl(filename, fileSize, {
            description: options.description,
            tags,
          });

          spinner.text = `Uploading ${filename} (${formatSize(fileSize)})...`;

          // Read file and calculate hash
          const fileBuffer = await readFile(localPath);
          const hash = sha256(fileBuffer);

          // Upload to presigned URL
          const uploadResponse = await fetch(presigned.upload_url, {
            method: presigned.upload_method,
            body: fileBuffer,
            headers: presigned.upload_headers,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }

          // Confirm upload
          spinner.text = 'Confirming upload...';
          const confirmed = await client.files.confirmUpload(
            presigned.file_id,
            hash
          );

          result = {
            file_id: confirmed.file_id,
            filename: confirmed.filename,
            size_bytes: confirmed.size_bytes,
          };
        } else {
          // Use direct multipart upload for small files
          const fileBuffer = await readFile(localPath);
          const blob = new Blob([fileBuffer]);

          const uploadResult = await client.files.upload(blob, filename, {
            description: options.description,
            tags,
          });

          result = {
            file_id: uploadResult.file_id,
            filename: uploadResult.filename,
            size_bytes: uploadResult.size_bytes,
          };
        }

        spinner.succeed(`Uploaded ${result.filename}`);
        blank();
        keyValue('File ID', result.file_id);
        keyValue('Size', formatSize(result.size_bytes));
        blank();
        hint(`Attach to agent: cast agents files add <agent-slug> ${result.file_id}`);
      } catch (err) {
        handleError(err);
      }
    }
  );

/**
 * cast files get <file_id>
 */
const getCommand = new Command('get')
  .description('Get file details')
  .argument('<file_id>', 'File ID')
  .action(async (fileId: string) => {
    const spinner = ora('Fetching file...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      const file = await client.files.get(fileId);

      spinner.stop();
      blank();
      keyValue('File ID', file.file_id);
      keyValue('Filename', file.filename);
      keyValue('Size', formatSize(file.size_bytes));
      keyValue('Content Type', file.content_type ?? 'unknown');
      keyValue('Scope', formatScope(file.scope));
      if (file.scope_id) {
        keyValue('Scope ID', file.scope_id);
      }
      keyValue('Status', formatUploadStatus(file.upload_status));
      if (file.description) {
        keyValue('Description', file.description);
      }
      if (file.tags.length > 0) {
        keyValue('Tags', file.tags.join(', '));
      }
      keyValue('SHA256', file.sha256_hash);
      keyValue('Created', formatFileDate(file.created_at));
      keyValue('Updated', formatFileDate(file.updated_at));
      blank();
    } catch (err) {
      spinner.fail('Failed to get file');
      handleError(err);
    }
  });

/**
 * cast files delete <file_id>
 */
const deleteCommand = new Command('delete')
  .description('Delete a file')
  .argument('<file_id>', 'File ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (fileId: string, options: { force?: boolean }) => {
    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      // Confirm deletion unless --force is used
      if (!options.force) {
        const readline = await import('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(
            chalk.yellow(
              `Are you sure you want to delete file '${fileId}'? [y/N] `
            ),
            resolve
          );
        });
        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          info('Deletion cancelled');
          return;
        }
      }

      const spinner = ora('Deleting file...').start();

      await client.files.delete(fileId);
      spinner.succeed(`File '${fileId}' deleted`);
    } catch (err) {
      handleError(err);
    }
  });

/**
 * cast files download <file_id>
 */
const downloadCommand = new Command('download')
  .description('Download a file')
  .argument('<file_id>', 'File ID')
  .option('--output <path>', 'Output file path (default: original filename)')
  .action(async (fileId: string, options: { output?: string }) => {
    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      // First get file metadata to know the filename
      const spinner = ora('Fetching file info...').start();
      const file = await client.files.get(fileId);

      const outputPath = options.output || file.filename;
      spinner.text = `Downloading ${file.filename}...`;

      // Download file content via SDK (uses configured base URL and auth)
      const response = await client.files.download(fileId);

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
  });

/**
 * cast files usage
 */
const usageCommand = new Command('usage')
  .description('Show storage usage')
  .action(async () => {
    const spinner = ora('Fetching storage usage...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      const usage = await client.files.getUsage();

      spinner.stop();
      blank();
      keyValue('Total Files', formatNumber(usage.total_files));
      keyValue('Total Size', formatSize(usage.total_bytes));
      keyValue('Quota Used', `${usage.usage_percent.toFixed(1)}%`);
      keyValue('Quota Limit', `${usage.limit_mb} MB`);
      blank();

      // Show progress bar
      const barWidth = 40;
      const filled = Math.round((usage.usage_percent / 100) * barWidth);
      const empty = barWidth - filled;
      const bar =
        chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
      console.log(`  ${bar} ${usage.usage_percent.toFixed(1)}%`);
      blank();
    } catch (err) {
      spinner.fail('Failed to get storage usage');
      handleError(err);
    }
  });

/**
 * cast files
 */
export const filesCommand = new Command('files')
  .description('Manage files in Castari storage')
  .addCommand(listCommand)
  .addCommand(uploadCommand)
  .addCommand(getCommand)
  .addCommand(deleteCommand)
  .addCommand(downloadCommand)
  .addCommand(usageCommand);
