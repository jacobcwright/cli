import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import prompts from 'prompts';
import { readFile } from 'node:fs/promises';
import { CastariClient, type StorageProvider } from '@castari/sdk';
import { success, info, hint, blank, keyValue, formatDate } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Format provider with color
 */
function formatProvider(provider: string): string {
  switch (provider) {
    case 's3':
      return chalk.yellow('S3');
    case 'gcs':
      return chalk.blue('GCS');
    case 'r2':
      return chalk.magenta('R2');
    default:
      return provider;
  }
}

/**
 * Format credentials status
 */
function formatCredentials(hasCredentials: boolean): string {
  return hasCredentials ? chalk.green('Yes') : chalk.gray('No');
}

/**
 * cast buckets list
 */
const listCommand = new Command('list')
  .description('List all storage buckets')
  .action(async () => {
    const spinner = ora('Fetching buckets...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const buckets = await client.storage.getBuckets();

      spinner.stop();

      if (buckets.length === 0) {
        info('No buckets found');
        hint("Create one with 'cast buckets create <name>'");
        return;
      }

      const table = new Table({
        head: [
          chalk.white('Slug'),
          chalk.white('Name'),
          chalk.white('Provider'),
          chalk.white('Bucket'),
          chalk.white('Credentials'),
          chalk.white('Created'),
        ],
        style: {
          head: [],
          border: [],
        },
      });

      for (const bucket of buckets) {
        table.push([
          bucket.slug,
          bucket.name,
          formatProvider(bucket.provider),
          bucket.bucket_name,
          formatCredentials(bucket.has_credentials),
          formatDate(bucket.created_at),
        ]);
      }

      console.log(table.toString());
    } catch (err) {
      spinner.fail('Failed to list buckets');
      handleError(err);
    }
  });

/**
 * cast buckets create <name>
 */
const createCommand = new Command('create')
  .description('Create a new storage bucket')
  .argument('<name>', 'Bucket name')
  .option('--slug <slug>', 'Custom slug (default: auto-generated from name)')
  .option('--provider <provider>', 'Storage provider: s3, gcs, or r2')
  .option('--bucket-name <name>', 'Cloud bucket name')
  .option('--region <region>', 'Region (for S3)')
  .option('--endpoint <url>', 'Endpoint URL (for R2 or S3-compatible)')
  .action(
    async (
      name: string,
      options: {
        slug?: string;
        provider?: string;
        bucketName?: string;
        region?: string;
        endpoint?: string;
      }
    ) => {
      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        let provider = options.provider as StorageProvider | undefined;
        let bucketName = options.bucketName;
        let region = options.region;
        let endpoint = options.endpoint;

        // Interactive mode if provider or bucket name not provided
        if (!provider || !bucketName) {
          const responses = await prompts([
            {
              type: provider ? null : 'select',
              name: 'provider',
              message: 'Select storage provider',
              choices: [
                { title: 'Amazon S3', value: 's3' },
                { title: 'Google Cloud Storage', value: 'gcs' },
                { title: 'Cloudflare R2', value: 'r2' },
              ],
            },
            {
              type: bucketName ? null : 'text',
              name: 'bucketName',
              message: 'Cloud bucket name',
              validate: (value) => (value.length > 0 ? true : 'Bucket name is required'),
            },
            {
              type: (prev, values) =>
                (values.provider || provider) === 's3' && !region ? 'text' : null,
              name: 'region',
              message: 'AWS region (e.g., us-east-1)',
              initial: 'us-east-1',
            },
            {
              type: (prev, values) =>
                (values.provider || provider) === 'r2' && !endpoint ? 'text' : null,
              name: 'endpoint',
              message: 'R2 endpoint URL',
              validate: (value) => (value.length > 0 ? true : 'Endpoint URL is required for R2'),
            },
          ]);

          if (!responses.provider && !provider) {
            info('Bucket creation cancelled');
            return;
          }

          provider = provider || responses.provider;
          bucketName = bucketName || responses.bucketName;
          region = region || responses.region;
          endpoint = endpoint || responses.endpoint;
        }

        if (!provider || !bucketName) {
          handleError(new Error('Provider and bucket name are required'));
        }

        // Generate slug from name if not provided
        const slug =
          options.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const spinner = ora('Creating bucket...').start();

        const bucket = await client.storage.createBucket({
          name,
          slug,
          provider: provider!,
          bucketName: bucketName!,
          region,
          endpointUrl: endpoint,
        });

        spinner.succeed(`Bucket '${bucket.name}' created!`);
        blank();
        keyValue('Slug', bucket.slug);
        keyValue('Provider', formatProvider(bucket.provider));
        keyValue('Bucket Name', bucket.bucket_name);
        if (bucket.region) {
          keyValue('Region', bucket.region);
        }
        if (bucket.endpoint_url) {
          keyValue('Endpoint', bucket.endpoint_url);
        }
        blank();
        hint(`Set credentials with: cast buckets credentials ${bucket.slug}`);
      } catch (err) {
        handleError(err);
      }
    }
  );

/**
 * cast buckets get <slug>
 */
const getCommand = new Command('get')
  .description('Get bucket details')
  .argument('<slug>', 'Bucket slug')
  .action(async (slug: string) => {
    const spinner = ora('Fetching bucket...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const bucket = await client.storage.getBucket(slug);

      spinner.stop();
      blank();
      keyValue('Name', bucket.name);
      keyValue('Slug', bucket.slug);
      keyValue('Provider', formatProvider(bucket.provider));
      keyValue('Bucket Name', bucket.bucket_name);
      keyValue('Region', bucket.region ?? undefined);
      keyValue('Endpoint', bucket.endpoint_url ?? undefined);
      keyValue('Has Credentials', bucket.has_credentials ? 'Yes' : 'No');
      keyValue('Created', formatDate(bucket.created_at));
      keyValue('Updated', formatDate(bucket.updated_at));
      blank();
    } catch (err) {
      spinner.fail('Failed to get bucket');
      handleError(err);
    }
  });

/**
 * cast buckets delete <slug>
 */
const deleteCommand = new Command('delete')
  .description('Delete a storage bucket')
  .argument('<slug>', 'Bucket slug')
  .option('-f, --force', 'Skip confirmation')
  .action(async (slug: string, options: { force?: boolean }) => {
    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      // Confirm deletion unless --force is used
      if (!options.force) {
        const response = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete bucket '${slug}'? This will remove all associated mounts.`,
          initial: false,
        });

        if (!response.confirm) {
          info('Deletion cancelled');
          return;
        }
      }

      const spinner = ora('Deleting bucket...').start();

      await client.storage.deleteBucket(slug);
      spinner.succeed(`Bucket '${slug}' deleted`);
    } catch (err) {
      handleError(err);
    }
  });

/**
 * cast buckets test <slug>
 */
const testCommand = new Command('test')
  .description('Test bucket connection')
  .argument('<slug>', 'Bucket slug')
  .action(async (slug: string) => {
    const spinner = ora('Testing connection...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const result = await client.storage.testConnection(slug);

      if (result.success) {
        spinner.succeed(`Connection successful!`);
        if (result.latency_ms) {
          info(`Latency: ${result.latency_ms}ms`);
        }
      } else {
        spinner.fail(`Connection failed: ${result.message}`);
        process.exit(1);
      }
    } catch (err) {
      spinner.fail('Failed to test connection');
      handleError(err);
    }
  });

/**
 * cast buckets credentials <slug>
 */
const credentialsCommand = new Command('credentials')
  .description('Set bucket credentials')
  .argument('<slug>', 'Bucket slug')
  .option('--access-key-id <key>', 'S3/R2 access key ID')
  .option('--secret-access-key <secret>', 'S3/R2 secret access key')
  .option('--service-account-file <path>', 'Path to GCS service account JSON file')
  .action(
    async (
      slug: string,
      options: {
        accessKeyId?: string;
        secretAccessKey?: string;
        serviceAccountFile?: string;
      }
    ) => {
      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        // Get bucket to determine provider
        const bucket = await client.storage.getBucket(slug);

        let accessKeyId = options.accessKeyId;
        let secretAccessKey = options.secretAccessKey;
        let serviceAccountJson: string | undefined;

        if (options.serviceAccountFile) {
          // Read service account JSON from file
          try {
            serviceAccountJson = await readFile(options.serviceAccountFile, 'utf-8');
            // Validate it's valid JSON
            JSON.parse(serviceAccountJson);
          } catch {
            handleError(new Error(`Failed to read service account file: ${options.serviceAccountFile}`));
          }
        }

        // Interactive mode if credentials not provided via flags
        if (!accessKeyId && !secretAccessKey && !serviceAccountJson) {
          if (bucket.provider === 'gcs') {
            const response = await prompts({
              type: 'text',
              name: 'serviceAccountFile',
              message: 'Path to service account JSON file',
              validate: (value) => (value.length > 0 ? true : 'Path is required'),
            });

            if (!response.serviceAccountFile) {
              info('Credential setup cancelled');
              return;
            }

            try {
              serviceAccountJson = await readFile(response.serviceAccountFile, 'utf-8');
              JSON.parse(serviceAccountJson);
            } catch {
              handleError(new Error(`Failed to read service account file: ${response.serviceAccountFile}`));
            }
          } else {
            // S3 or R2
            const responses = await prompts([
              {
                type: 'text',
                name: 'accessKeyId',
                message: 'Access Key ID',
                validate: (value) => (value.length > 0 ? true : 'Access Key ID is required'),
              },
              {
                type: 'password',
                name: 'secretAccessKey',
                message: 'Secret Access Key',
                validate: (value) => (value.length > 0 ? true : 'Secret Access Key is required'),
              },
            ]);

            if (!responses.accessKeyId || !responses.secretAccessKey) {
              info('Credential setup cancelled');
              return;
            }

            accessKeyId = responses.accessKeyId;
            secretAccessKey = responses.secretAccessKey;
          }
        }

        const spinner = ora('Setting credentials...').start();

        await client.storage.setCredentials(slug, {
          accessKeyId,
          secretAccessKey,
          serviceAccountJson,
        });

        spinner.succeed(`Credentials set for bucket '${slug}'`);
        hint(`Test the connection with: cast buckets test ${slug}`);
      } catch (err) {
        handleError(err);
      }
    }
  );

/**
 * cast buckets
 */
export const bucketsCommand = new Command('buckets')
  .description('Manage storage buckets')
  .addCommand(listCommand)
  .addCommand(createCommand)
  .addCommand(getCommand)
  .addCommand(deleteCommand)
  .addCommand(testCommand)
  .addCommand(credentialsCommand);
