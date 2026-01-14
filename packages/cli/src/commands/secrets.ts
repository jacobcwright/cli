import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import { CastariClient } from '@castari/sdk';
import { success, info, hint, blank } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * cast secrets list <slug>
 */
const listCommand = new Command('list')
  .description('List secret keys for an agent')
  .argument('<slug>', 'Agent slug')
  .action(async (slug: string) => {
    const spinner = ora('Fetching secrets...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const secrets = await client.agents.listSecrets(slug);

      spinner.stop();

      if (secrets.length === 0) {
        info(`No secrets set for agent '${slug}'`);
        hint(`Set one with: cast secrets set ${slug} <key> <value>`);
        return;
      }

      blank();
      console.log(chalk.bold(`Secrets for '${slug}':`));
      blank();

      for (const secret of secrets) {
        console.log(`  ${chalk.cyan('•')} ${secret.key}`);
      }

      blank();
      info('Note: Secret values are never displayed for security');
    } catch (err) {
      spinner.fail('Failed to list secrets');
      handleError(err);
    }
  });

/**
 * cast secrets set <slug> <key> <value>
 */
const setCommand = new Command('set')
  .description('Set a secret for an agent')
  .argument('<slug>', 'Agent slug')
  .argument('<key>', 'Secret key (e.g., API_KEY)')
  .argument('<value>', 'Secret value')
  .action(async (slug: string, key: string, value: string) => {
    const spinner = ora('Setting secret...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      await client.agents.setSecret(slug, key, value);

      spinner.succeed(`Secret '${key}' set for agent '${slug}'`);
      hint('Redeploy the agent to apply changes');
    } catch (err) {
      spinner.fail('Failed to set secret');
      handleError(err);
    }
  });

/**
 * cast secrets delete <slug> <key>
 */
const deleteCommand = new Command('delete')
  .description('Delete a secret from an agent')
  .argument('<slug>', 'Agent slug')
  .argument('<key>', 'Secret key to delete')
  .action(async (slug: string, key: string) => {
    const spinner = ora('Deleting secret...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      await client.agents.deleteSecret(slug, key);

      spinner.succeed(`Secret '${key}' deleted from agent '${slug}'`);
      hint('Redeploy the agent to apply changes');
    } catch (err) {
      spinner.fail('Failed to delete secret');
      handleError(err);
    }
  });

/**
 * cast secrets
 */
export const secretsCommand = new Command('secrets')
  .description('Manage agent secrets')
  .addCommand(listCommand)
  .addCommand(setCommand)
  .addCommand(deleteCommand);
