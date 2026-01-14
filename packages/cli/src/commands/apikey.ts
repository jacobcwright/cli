import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { CastariClient } from '@castari/sdk';
import { success, info, blank, keyValue } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * cast apikey create
 */
const createCommand = new Command('create')
  .description('Create a new API key (only one per user)')
  .action(async () => {
    const spinner = ora('Creating API key...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const result = await client.auth.createApiKey();

      spinner.succeed('API key created!');
      blank();
      console.log(chalk.yellow('⚠ Save this key - it will only be shown once!'));
      blank();
      keyValue('API Key', chalk.green(result.api_key));
      keyValue('Prefix', result.prefix);
      blank();
      info('Use with: CASTARI_API_KEY=<key> cast <command>');
    } catch (err) {
      spinner.fail('Failed to create API key');
      handleError(err);
    }
  });

/**
 * cast apikey revoke
 */
const revokeCommand = new Command('revoke')
  .description('Revoke your API key')
  .action(async () => {
    const spinner = ora('Revoking API key...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      await client.auth.revokeApiKey();

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
  .addCommand(createCommand)
  .addCommand(revokeCommand);
