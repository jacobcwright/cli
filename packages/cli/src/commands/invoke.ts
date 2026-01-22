import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { CastariClient } from '@castari/sdk';
import { blank, formatNumber, formatCost } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export const invokeCommand = new Command('invoke')
  .description('Invoke an agent with a prompt')
  .argument('<slug>', 'Agent slug')
  .argument('[prompt]', 'Prompt to send to the agent')
  .option('-i, --input <file>', 'Read prompt from file')
  .option('-s, --session <id>', 'Session ID for conversation continuity (reuses sandbox)')
  .action(async (slug: string, promptArg?: string, options?: { input?: string; session?: string }) => {
    try {
      // Get prompt from argument or file
      let prompt: string;

      if (options?.input) {
        prompt = await readFile(options.input, 'utf-8');
      } else if (promptArg) {
        prompt = promptArg;
      } else {
        console.error(chalk.red('Error: Either a prompt or --input <file> is required'));
        process.exit(1);
      }

      const spinner = ora(`Invoking ${slug}...`).start();

      const client = new CastariClient();
      await client.ensureAuthenticated();

      spinner.text = `Invoking ${slug}... (this may take a while)`;
      const result = await client.agents.invoke(slug, {
        prompt,
        sessionId: options?.session,
      });

      spinner.stop();
      blank();

      // Print the response
      console.log(result.response_content);

      // Print usage stats
      blank();
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.gray(`Session: ${result.session_id}`));
      console.log(
        chalk.gray(
          `Tokens: ${formatNumber(result.input_tokens)} in / ${formatNumber(result.output_tokens)} out`
        )
      );
      const cost = typeof result.total_cost_usd === 'string'
        ? parseFloat(result.total_cost_usd)
        : result.total_cost_usd;
      console.log(chalk.gray(`Cost: ${formatCost(cost)}`));
      console.log(chalk.gray(`Duration: ${(result.duration_ms / 1000).toFixed(1)}s`));
    } catch (err) {
      handleError(err);
    }
  });
