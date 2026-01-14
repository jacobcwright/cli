import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { CastariClient } from '@castari/sdk';
import { success, keyValue, blank, hint } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export const deployCommand = new Command('deploy')
  .description('Deploy an agent')
  .argument('<slug>', 'Agent slug')
  .action(async (slug: string) => {
    const spinner = ora(`Deploying ${slug}...`).start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      spinner.text = `Deploying ${slug}... (this may take a minute)`;
      const agent = await client.agents.deploy(slug);

      spinner.succeed(`Agent '${slug}' deployed!`);
      blank();
      keyValue('Status', chalk.green(agent.status));
      keyValue('Sandbox ID', agent.sandbox_id ?? undefined);
      blank();
      hint(`Invoke with: cast invoke ${slug} "your prompt here"`);
    } catch (err) {
      spinner.fail('Deployment failed');
      handleError(err);
    }
  });
