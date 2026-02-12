import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import { CastariClient } from '@castari/sdk';
import {
  success,
  error,
  hint,
  keyValue,
  blank,
  formatDate,
  info,
  formatNumber,
} from '../utils/output.js';
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
 * Format agent status with color
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green(status);
    case 'deploying':
      return chalk.yellow(status);
    case 'draft':
      return chalk.blue(status);
    case 'stopped':
      return chalk.gray(status);
    case 'error':
      return chalk.red(status);
    default:
      return status;
  }
}

/**
 * cast agents list
 */
const listCommand = new Command('list').description('List all agents').action(async () => {
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
 * cast agents update <slug>
 */
const updateCommand = new Command('update')
  .description('Update an agent configuration')
  .argument('<slug>', 'Agent slug')
  .option('--name <name>', 'New display name')
  .option('--description <description>', 'New description')
  .option('--git-url <url>', 'New git repository URL')
  .option('--git-branch <branch>', 'New git branch')
  .option('--model <model>', 'Default model')
  .option('--max-turns <turns>', 'Maximum turns per invocation')
  .option('--timeout <seconds>', 'Timeout in seconds')
  .action(
    async (
      slug: string,
      options: {
        name?: string;
        description?: string;
        gitUrl?: string;
        gitBranch?: string;
        model?: string;
        maxTurns?: string;
        timeout?: string;
      }
    ) => {
      const spinner = ora('Updating agent...').start();

      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        const agent = await client.agents.update(slug, {
          name: options.name,
          description: options.description,
          gitRepoUrl: options.gitUrl,
          gitBranch: options.gitBranch,
          defaultModel: options.model,
          maxTurns: options.maxTurns ? parseInt(options.maxTurns, 10) : undefined,
          timeoutSeconds: options.timeout ? parseInt(options.timeout, 10) : undefined,
        });

        spinner.succeed(`Agent '${slug}' updated`);
        blank();
        keyValue('Name', agent.name);
        keyValue('Status', formatStatus(agent.status));
        keyValue('Model', agent.default_model);
        keyValue('Max Turns', agent.max_turns);
        keyValue('Timeout', `${agent.timeout_seconds}s`);
        blank();
      } catch (err) {
        spinner.fail('Failed to update agent');
        handleError(err);
      }
    }
  );

// ============================================================================
// Agent Files Subcommands
// ============================================================================

/**
 * cast agents files list <slug>
 */
const filesListCommand = new Command('list')
  .description('List files attached to an agent')
  .argument('<slug>', 'Agent slug')
  .action(async (slug: string) => {
    const spinner = ora('Fetching attached files...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      const result = await client.files.listAgentFiles(slug);

      spinner.stop();

      if (result.files.length === 0) {
        info(`No files attached to agent '${slug}'`);
        hint('Attach a file with: cast agents files add <slug> <file_id>');
        return;
      }

      const table = new Table({
        head: [
          chalk.white('File ID'),
          chalk.white('Filename'),
          chalk.white('Mount Path'),
          chalk.white('Size'),
          chalk.white('Mode'),
        ],
        style: {
          head: [],
          border: [],
        },
        colWidths: [24, 24, 28, 12, 8],
      });

      for (const file of result.files) {
        table.push([
          file.file_id,
          file.filename.length > 22 ? file.filename.substring(0, 19) + '...' : file.filename,
          file.mount_path,
          formatSize(file.size_bytes),
          file.read_only ? chalk.gray('ro') : chalk.green('rw'),
        ]);
      }

      console.log(table.toString());
      blank();
      info(
        `${formatNumber(result.files.length)} file${result.files.length === 1 ? '' : 's'} attached (${formatSize(result.total_size_bytes)} total)`
      );
    } catch (err) {
      spinner.fail('Failed to list attached files');
      handleError(err);
    }
  });

/**
 * cast agents files add <slug> <file_id>
 */
const filesAddCommand = new Command('add')
  .description('Attach a file to an agent')
  .argument('<slug>', 'Agent slug')
  .argument('<file_id>', 'File ID to attach')
  .option('--mount-path <path>', 'Custom mount path (default: /files/agent/<filename>)')
  .option('--writable', 'Make file writable (default: read-only)')
  .action(
    async (slug: string, fileId: string, options: { mountPath?: string; writable?: boolean }) => {
      const spinner = ora('Attaching file...').start();

      try {
        const client = new CastariClient();
        await client.ensureAuthenticated();

        const attached = await client.files.attachToAgent(slug, {
          fileId,
          mountPath: options.mountPath,
          readOnly: !options.writable,
        });

        spinner.succeed(`File attached to agent '${slug}'`);
        blank();
        keyValue('File ID', attached.file_id);
        keyValue('Filename', attached.filename);
        keyValue('Mount Path', attached.mount_path);
        keyValue('Mode', attached.read_only ? 'read-only' : 'read-write');
        blank();
        hint(`File will be available at ${attached.mount_path} in the sandbox`);
      } catch (err) {
        spinner.fail('Failed to attach file');
        handleError(err);
      }
    }
  );

/**
 * cast agents files remove <slug> <file_id>
 */
const filesRemoveCommand = new Command('remove')
  .description('Detach a file from an agent')
  .argument('<slug>', 'Agent slug')
  .argument('<file_id>', 'File ID to detach')
  .option('-f, --force', 'Skip confirmation')
  .action(async (slug: string, fileId: string, options: { force?: boolean }) => {
    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      // Confirm removal unless --force is used
      if (!options.force) {
        const readline = await import('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(
            chalk.yellow(`Detach file '${fileId}' from agent '${slug}'? [y/N] `),
            resolve
          );
        });
        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          info('Detachment cancelled');
          return;
        }
      }

      const spinner = ora('Detaching file...').start();

      await client.files.detachFromAgent(slug, fileId);
      spinner.succeed(`File '${fileId}' detached from agent '${slug}'`);
    } catch (err) {
      handleError(err);
    }
  });

/**
 * cast agents files
 */
const filesCommand = new Command('files')
  .description('Manage files attached to an agent')
  .addCommand(filesListCommand)
  .addCommand(filesAddCommand)
  .addCommand(filesRemoveCommand);

/**
 * cast agents
 */
export const agentsCommand = new Command('agents')
  .description('Manage agents')
  .addCommand(listCommand)
  .addCommand(createCommand)
  .addCommand(getCommand)
  .addCommand(updateCommand)
  .addCommand(deleteCommand)
  .addCommand(filesCommand);
