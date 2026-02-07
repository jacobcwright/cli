import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { CastariClient } from '@castari/sdk';
import { info, blank, formatDate } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * cast sessions list <slug>
 */
const listCommand = new Command('list')
  .description('List sessions for an agent')
  .argument('<slug>', 'Agent slug')
  .action(async (slug: string) => {
    const spinner = ora('Fetching sessions...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const sessions = await client.agents.listSessions(slug);

      spinner.stop();

      if (sessions.length === 0) {
        info(`No sessions found for agent '${slug}'`);
        return;
      }

      const table = new Table({
        head: [
          chalk.white('Session ID'),
          chalk.white('Sandbox ID'),
          chalk.white('Created'),
          chalk.white('Last Invocation'),
        ],
        style: { head: [], border: [] },
      });

      for (const session of sessions) {
        table.push([
          session.id,
          session.sandbox_id ?? chalk.gray('N/A'),
          formatDate(session.created_at),
          session.last_invocation_at ? formatDate(session.last_invocation_at) : chalk.gray('Never'),
        ]);
      }

      console.log(table.toString());
    } catch (err) {
      spinner.fail('Failed to list sessions');
      handleError(err);
    }
  });

/**
 * cast sessions delete <slug> <session-id>
 */
const deleteCommand = new Command('delete')
  .description('Delete a session')
  .argument('<slug>', 'Agent slug')
  .argument('<session-id>', 'Session ID to delete')
  .action(async (slug: string, sessionId: string) => {
    const spinner = ora('Deleting session...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      await client.agents.deleteSession(slug, sessionId);

      spinner.succeed(`Session '${sessionId}' deleted`);
    } catch (err) {
      spinner.fail('Failed to delete session');
      handleError(err);
    }
  });

/**
 * cast sessions
 */
export const sessionsCommand = new Command('sessions')
  .description('Manage agent sessions')
  .addCommand(listCommand)
  .addCommand(deleteCommand);
