import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { CastariClient } from '@castari/sdk';
import { info, blank, formatDate, formatNumber, formatCost } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * cast invocations list <slug>
 */
const listCommand = new Command('list')
  .description('List invocation history for an agent')
  .argument('<slug>', 'Agent slug')
  .option('--status <status>', 'Filter by status (completed, failed)')
  .option('--limit <limit>', 'Maximum results to return', '20')
  .action(async (slug: string, options: { status?: string; limit: string }) => {
    const spinner = ora('Fetching invocations...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();
      const invocations = await client.agents.listInvocations(slug, {
        status: options.status,
        limit: parseInt(options.limit, 10),
      });

      spinner.stop();

      if (invocations.length === 0) {
        info(`No invocations found for agent '${slug}'`);
        return;
      }

      const table = new Table({
        head: [
          chalk.white('ID'),
          chalk.white('Status'),
          chalk.white('Tokens'),
          chalk.white('Cost'),
          chalk.white('Duration'),
          chalk.white('Created'),
        ],
        style: { head: [], border: [] },
      });

      for (const inv of invocations) {
        const statusColor = inv.status === 'completed' ? chalk.green : chalk.red;
        table.push([
          inv.id.length > 16 ? inv.id.substring(0, 13) + '...' : inv.id,
          statusColor(inv.status),
          `${formatNumber(inv.input_tokens)}/${formatNumber(inv.output_tokens)}`,
          formatCost(
            typeof inv.total_cost_usd === 'string'
              ? parseFloat(inv.total_cost_usd)
              : inv.total_cost_usd
          ),
          `${inv.duration_ms}ms`,
          formatDate(inv.created_at),
        ]);
      }

      console.log(table.toString());
      blank();
      info(`${invocations.length} invocation${invocations.length === 1 ? '' : 's'} shown`);
    } catch (err) {
      spinner.fail('Failed to list invocations');
      handleError(err);
    }
  });

/**
 * cast invocations
 */
export const invocationsCommand = new Command('invocations')
  .description('View invocation history')
  .addCommand(listCommand);
