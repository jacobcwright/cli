import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { CastariClient, NotFoundError } from '@castari/sdk';
import { success, keyValue, blank, hint, error, info } from '../utils/output.js';
import { handleError } from '../utils/errors.js';
import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import * as os from 'os';

interface CastariConfig {
  name: string;
  version?: string;
  entrypoint?: string;
  runtime?: string;
}

/**
 * Load castari.json from the current directory
 */
function loadProjectConfig(dir: string): CastariConfig | null {
  const configPath = path.join(dir, 'castari.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as CastariConfig;
  } catch {
    return null;
  }
}

/**
 * Convert a project name to a valid slug
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/**
 * Create a tarball of the project directory
 */
async function createTarball(projectDir: string): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'castari-deploy-'));
  const tarballPath = path.join(tempDir, 'code.tar.gz');

  // Get list of files to include (respect .gitignore patterns)
  const filesToInclude: string[] = [];
  const ignorePatterns = loadGitignore(projectDir);

  function walkDir(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      // Skip common directories that shouldn't be deployed
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === '.castari'
        ) {
          continue;
        }
        // Check gitignore patterns
        if (shouldIgnore(relPath + '/', ignorePatterns)) {
          continue;
        }
        walkDir(fullPath, relPath);
      } else {
        // Check gitignore patterns
        if (!shouldIgnore(relPath, ignorePatterns)) {
          filesToInclude.push(relPath);
        }
      }
    }
  }

  walkDir(projectDir);

  // Create tarball
  await tar.create(
    {
      gzip: true,
      file: tarballPath,
      cwd: projectDir,
    },
    filesToInclude
  );

  return tarballPath;
}

/**
 * Load .gitignore patterns
 */
function loadGitignore(dir: string): string[] {
  const gitignorePath = path.join(dir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

/**
 * Check if a path should be ignored based on patterns
 */
function shouldIgnore(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple pattern matching (doesn't handle all gitignore features)
    if (pattern.endsWith('/')) {
      // Directory pattern
      if (filePath.startsWith(pattern) || filePath === pattern.slice(0, -1)) {
        return true;
      }
    } else if (pattern.includes('*')) {
      // Wildcard pattern
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      if (regex.test(filePath) || regex.test(path.basename(filePath))) {
        return true;
      }
    } else {
      // Exact match or prefix match
      if (filePath === pattern || filePath.startsWith(pattern + '/')) {
        return true;
      }
    }
  }
  return false;
}

export const deployCommand = new Command('deploy')
  .description('Deploy an agent from local project or by slug')
  .argument('[slug]', 'Agent slug (optional if in a Castari project directory)')
  .action(async (slug?: string) => {
    const projectDir = process.cwd();

    try {
      const client = new CastariClient();
      await client.ensureAuthenticated();

      // If no slug provided, try to detect from castari.json
      if (!slug) {
        const config = loadProjectConfig(projectDir);
        if (!config) {
          error('No castari.json found in current directory');
          blank();
          hint('Either provide an agent slug: cast deploy <slug>');
          hint('Or run from a Castari project directory with castari.json');
          process.exit(1);
        }

        slug = nameToSlug(config.name);
        info(`Detected project: ${chalk.cyan(config.name)}`);

        // Check if agent exists
        let agent;
        try {
          agent = await client.agents.get(slug);
          info(`Found existing agent: ${chalk.cyan(slug)}`);
        } catch (e) {
          if (e instanceof NotFoundError) {
            // Create the agent
            const createSpinner = ora(`Creating agent '${slug}'...`).start();
            try {
              agent = await client.agents.create({
                name: config.name,
                slug: slug,
                sourceType: 'local',
              });
              createSpinner.succeed(`Created agent '${slug}'`);
            } catch (err) {
              createSpinner.fail('Failed to create agent');
              throw err;
            }
          } else {
            throw e;
          }
        }

        // Create tarball and upload
        const tarSpinner = ora('Packaging project...').start();
        let tarballPath: string;
        try {
          tarballPath = await createTarball(projectDir);
          const stats = fs.statSync(tarballPath);
          tarSpinner.succeed(`Packaged project (${(stats.size / 1024).toFixed(1)} KB)`);
        } catch (err) {
          tarSpinner.fail('Failed to package project');
          throw err;
        }

        // Upload and deploy
        const deploySpinner = ora(
          `Deploying ${chalk.cyan(slug)}... (this may take a minute)`
        ).start();
        try {
          const content = fs.readFileSync(tarballPath);
          const blob = new Blob([content], { type: 'application/gzip' });
          const result = await client.agents.uploadCode(slug, blob, 'code.tar.gz', {
            autoDeploy: true,
          });

          // Cleanup temp file
          fs.unlinkSync(tarballPath);
          fs.rmdirSync(path.dirname(tarballPath));

          deploySpinner.succeed(`Agent '${slug}' deployed!`);
          blank();
          keyValue('Status', chalk.green(result.status));
          keyValue('Sandbox ID', result.sandbox_id ?? undefined);
          blank();
          hint(`Invoke with: cast invoke ${slug} "your prompt here"`);
        } catch (err) {
          deploySpinner.fail('Deployment failed');
          // Cleanup temp file on error
          try {
            fs.unlinkSync(tarballPath);
            fs.rmdirSync(path.dirname(tarballPath));
          } catch {
            // Ignore cleanup errors
          }
          throw err;
        }
      } else {
        // Traditional deployment by slug (for git-based agents)
        const spinner = ora(`Deploying ${slug}...`).start();

        spinner.text = `Deploying ${slug}... (this may take a minute)`;
        const agent = await client.agents.deploy(slug);

        spinner.succeed(`Agent '${slug}' deployed!`);
        blank();
        keyValue('Status', chalk.green(agent.status));
        keyValue('Sandbox ID', agent.sandbox_id ?? undefined);
        blank();
        hint(`Invoke with: cast invoke ${slug} "your prompt here"`);
      }
    } catch (err) {
      handleError(err);
    }
  });
