import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import { CastariClient } from '@castari/sdk';
import { success, error, hint, keyValue, blank, formatDate, info } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Format agent status with color
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green(status);
    case 'deploying':
      return chalk.yellow(status);
    case 'pending':
      return chalk.blue(status);
    case 'stopped':
      return chalk.gray(status);
    case 'failed':
      return chalk.red(status);
    default:
      return status;
  }
}

/**
 * cast agents list
 */
const listCommand = new Command('list')
  .description('List all agents')
  .action(async () => {
    const spinner = ora('Fetching agents...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const agents = await client.agents.list();

      spinner.stop();

      if (agents.length === 0) {
        info('No agents found');
        hint("Create one with 'cast agents create <name> <git-url>'");
        return;
      }

      const table = new Table({
        head: [
          chalk.white('Slug'),
          chalk.white('Name'),
          chalk.white('Status'),
          chalk.white('Created'),
        ],
        style: {
          head: [],
          border: [],
        },
      });

      for (const agent of agents) {
        table.push([
          agent.slug,
          agent.name,
          formatStatus(agent.status),
          formatDate(agent.created_at),
        ]);
      }

      console.log(table.toString());
    } catch (err) {
      spinner.fail('Failed to list agents');
      handleError(err);
    }
  });

/**
 * cast agents create <name> <git-url>
 */
const createCommand = new Command('create')
  .description('Create a new agent')
  .argument('<name>', 'Agent name')
  .argument('<git-url>', 'Git repository URL')
  .option('--slug <slug>', 'Custom slug (default: auto-generated from name)')
  .action(async (name: string, gitUrl: string, options: { slug?: string }) => {
    const spinner = ora('Creating agent...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const agent = await client.agents.create({
        name,
        gitRepoUrl: gitUrl,
        slug: options.slug,
      });

      spinner.succeed(`Agent '${agent.name}' created!`);
      blank();
      keyValue('Slug', agent.slug);
      keyValue('Git URL', agent.git_repo_url ?? undefined);
      keyValue('Status', agent.status);
      blank();
      hint(`Deploy with: cast deploy ${agent.slug}`);
    } catch (err) {
      spinner.fail('Failed to create agent');
      handleError(err);
    }
  });

/**
 * cast agents get <slug>
 */
const getCommand = new Command('get')
  .description('Get agent details')
  .argument('<slug>', 'Agent slug')
  .action(async (slug: string) => {
    const spinner = ora('Fetching agent...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const agent = await client.agents.get(slug);

      spinner.stop();
      blank();
      keyValue('Name', agent.name);
      keyValue('Slug', agent.slug);
      keyValue('Git URL', agent.git_repo_url ?? undefined);
      keyValue('Status', formatStatus(agent.status));
      keyValue('Sandbox ID', agent.sandbox_id ?? undefined);
      keyValue('Created', formatDate(agent.created_at));
      keyValue('Updated', formatDate(agent.updated_at));
      blank();
    } catch (err) {
      spinner.fail('Failed to get agent');
      handleError(err);
    }
  });

/**
 * cast agents delete <slug>
 */
const deleteCommand = new Command('delete')
  .description('Delete an agent')
  .argument('<slug>', 'Agent slug')
  .option('-f, --force', 'Skip confirmation')
  .action(async (slug: string, options: { force?: boolean }) => {
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
            chalk.yellow(`Are you sure you want to delete agent '${slug}'? [y/N] `),
            resolve
          );
        });
        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          info('Deletion cancelled');
          return;
        }
      }

      const spinner = ora('Deleting agent...').start();

      await client.agents.delete(slug);
      spinner.succeed(`Agent '${slug}' deleted`);
    } catch (err) {
      handleError(err);
    }
  });

/**
 * cast agents
 */
export const agentsCommand = new Command('agents')
  .description('Manage agents')
  .addCommand(listCommand)
  .addCommand(createCommand)
  .addCommand(getCommand)
  .addCommand(deleteCommand);
