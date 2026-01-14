import { Command } from 'commander';
import ora from 'ora';
import { CastariClient } from '@castari/sdk';
import { success, keyValue, blank } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export const stopCommand = new Command('stop')
  .description('Stop a running agent')
  .argument('<slug>', 'Agent slug')
  .action(async (slug: string) => {
    const spinner = ora(`Stopping ${slug}...`).start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      const agent = await client.agents.stop(slug);

      spinner.succeed(`Agent '${slug}' stopped`);
      blank();
      keyValue('Status', agent.status);
      blank();
    } catch (err) {
      spinner.fail('Failed to stop agent');
      handleError(err);
    }
  });
