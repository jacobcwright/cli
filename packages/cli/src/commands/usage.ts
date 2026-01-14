import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import { CastariClient } from '@castari/sdk';
import { blank, formatNumber, formatCost, header } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export const usageCommand = new Command('usage')
  .description('Show usage statistics')
  .option('-d, --days <days>', 'Number of days to show (default: 30)', '30')
  .option('--daily', 'Show daily breakdown')
  .action(async (options: { days: string; daily?: boolean }) => {
    const spinner = ora('Fetching usage data...').start();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      const days = parseInt(options.days, 10);

      if (options.daily) {
        // Show daily breakdown
        const dailyUsage = await client.usage.daily({ days });

        spinner.stop();
        blank();
        header(`Usage (last ${days} days)`);
        blank();

        if (dailyUsage.length === 0) {
          console.log(chalk.gray('  No usage data available'));
          return;
        }

        const table = new Table({
          head: [
            chalk.white('Date'),
            chalk.white('Invocations'),
            chalk.white('Input Tokens'),
            chalk.white('Output Tokens'),
            chalk.white('Cost'),
          ],
          style: {
            head: [],
            border: [],
          },
        });

        for (const day of dailyUsage) {
          table.push([
            day.date,
            formatNumber(day.invocation_count),
            formatNumber(day.input_tokens),
            formatNumber(day.output_tokens),
            formatCost(day.cost_usd),
          ]);
        }

        console.log(table.toString());
      } else {
        // Show summary
        const summary = await client.usage.summary({ days });

        spinner.stop();
        blank();
        header(`Usage Summary (last ${days} days)`);
        blank();

        const table = new Table({
          style: {
            head: [],
            border: [],
          },
        });

        table.push(
          [chalk.gray('Total Invocations'), formatNumber(summary.total_invocations)],
          [chalk.gray('Input Tokens'), formatNumber(summary.total_input_tokens)],
          [chalk.gray('Output Tokens'), formatNumber(summary.total_output_tokens)],
          [chalk.gray('Total Cost'), chalk.green(formatCost(summary.total_cost_usd))]
        );

        console.log(table.toString());
        blank();
      }
    } catch (err) {
      spinner.fail('Failed to fetch usage data');
      handleError(err);
    }
  });
