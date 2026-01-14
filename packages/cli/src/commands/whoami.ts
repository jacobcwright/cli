import { Command } from 'commander';
import ora from 'ora';
import { CastariClient } from '@castari/sdk';
import { keyValue, blank } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export const whoamiCommand = new Command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    const spinner = ora('Fetching user info...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const user = await client.auth.me();

      spinner.stop();
      blank();
      keyValue('Email', user.email);
      keyValue('User ID', user.id);
      keyValue('API Key', user.api_key_prefix ? `${user.api_key_prefix}...` : 'None');
      keyValue('Created', new Date(user.created_at).toLocaleDateString());
      blank();
    } catch (err) {
      spinner.fail('Failed to get user info');
      handleError(err);
    }
  });
