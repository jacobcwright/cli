import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { CastariClient } from '@castari/sdk';
import { success, info, blank, keyValue, formatDate } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * cast apikey list
 */
const listCommand = new Command('list')
  .description('List all API keys')
  .action(async () => {
    const spinner = ora('Fetching API keys...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const keys = await client.auth.listApiKeys();

      spinner.stop();

      if (keys.length === 0) {
        info('No API keys found');
        return;
      }

      const table = new Table({
        head: [
          chalk.white('ID'),
          chalk.white('Name'),
          chalk.white('Prefix'),
          chalk.white('Created'),
          chalk.white('Last Used'),
        ],
        style: { head: [], border: [] },
      });

      for (const key of keys) {
        table.push([
          key.id,
          key.name,
          key.prefix,
          formatDate(key.created_at),
          key.last_used_at ? formatDate(key.last_used_at) : chalk.gray('Never'),
        ]);
      }

      console.log(table.toString());
    } catch (err) {
      spinner.fail('Failed to list API keys');
      handleError(err);
    }
  });

/**
 * cast apikey create
 */
const createCommand = new Command('create')
  .description('Create a new API key')
  .option('--name <name>', 'Name for the API key (e.g., "Production")', 'Default')
  .action(async (options: { name: string }) => {
    const spinner = ora('Creating API key...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const result = await client.auth.createApiKey(options.name);

      spinner.succeed('API key created!');
      blank();
      console.log(chalk.yellow('Save this key - it will only be shown once!'));
      blank();
      keyValue('API Key', chalk.green(result.key));
      keyValue('Name', result.api_key.name);
      keyValue('Prefix', result.api_key.prefix);
      blank();
      info('Use with: CASTARI_API_KEY=<key> cast <command>');
    } catch (err) {
      spinner.fail('Failed to create API key');
      handleError(err);
    }
  });

/**
 * cast apikey revoke <key-id>
 */
const revokeCommand = new Command('revoke')
  .description('Revoke an API key')
  .argument('<key-id>', 'API key ID to revoke')
  .action(async (keyId: string) => {
    const spinner = ora('Revoking API key...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      await client.auth.revokeApiKey(keyId);

      spinner.succeed('API key revoked');
    } catch (err) {
      spinner.fail('Failed to revoke API key');
      handleError(err);
    }
  });

/**
 * cast apikey
 */
export const apikeyCommand = new Command('apikey')
  .description('Manage API keys')
  .addCommand(listCommand)
  .addCommand(createCommand)
  .addCommand(revokeCommand);
