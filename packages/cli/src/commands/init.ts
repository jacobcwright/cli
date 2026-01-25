import { Command } from 'commander';
import prompts from 'prompts';
import fsExtra from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import ora from 'ora';
import chalk from 'chalk';
import * as https from 'https';
import * as tar from 'tar';
import * as os from 'os';
import { success, error, hint, blank, header, info } from '../utils/output.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_REPO = 'castari/cli';
const GITHUB_BRANCH = 'main';
const TEMPLATES_DIR = 'templates';

interface Template {
  name: string;
  description: string;
}

const TEMPLATES: Record<string, Template> = {
  default: {
    name: 'default',
    description: 'Coding agent with file and bash tools (like Claude Code)',
  },
  'research-agent': {
    name: 'research-agent',
    description: 'Deep research with web search and document synthesis',
  },
  'support-agent': {
    name: 'support-agent',
    description: 'Customer support with ticket handling and escalation',
  },
  'mcp-tools': {
    name: 'mcp-tools',
    description: 'Agent with example MCP server integration',
  },
};

/**
 * List available templates
 */
function listTemplates(): void {
  blank();
  header('Available templates:');
  blank();
  for (const [key, tmpl] of Object.entries(TEMPLATES)) {
    console.log(`  ${chalk.cyan(key.padEnd(18))} ${tmpl.description}`);
  }
  blank();
}

/**
 * Get the local templates directory (for development)
 */
function getLocalTemplatesDir(): string | null {
  // Check for CASTARI_LOCAL_TEMPLATES env var
  if (process.env.CASTARI_LOCAL_TEMPLATES) {
    return process.env.CASTARI_LOCAL_TEMPLATES;
  }

  // Check if we're in the repo (look for templates dir relative to CLI)
  // This handles development scenarios
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const templatesPath = path.join(repoRoot, TEMPLATES_DIR);
  if (fsExtra.existsSync(templatesPath)) {
    return templatesPath;
  }

  return null;
}

/**
 * Download tarball from URL
 */
function downloadTarball(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fsExtra.createWriteStream(destPath);

    const request = (reqUrl: string) => {
      https.get(reqUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            request(redirectUrl);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fsExtra.unlink(destPath).catch(() => {}); // Clean up partial file
        reject(err);
      });
    };

    request(url);
  });
}

/**
 * Download template from GitHub
 */
async function downloadTemplateFromGitHub(
  templateName: string,
  targetDir: string
): Promise<void> {
  const tempDir = path.join(os.tmpdir(), `castari-template-${Date.now()}`);
  const tarballPath = path.join(tempDir, 'repo.tar.gz');

  try {
    await fsExtra.ensureDir(tempDir);

    // Download tarball from GitHub
    const tarballUrl = `https://codeload.github.com/${GITHUB_REPO}/tar.gz/${GITHUB_BRANCH}`;
    await downloadTarball(tarballUrl, tarballPath);

    // Extract tarball
    await tar.x({
      file: tarballPath,
      cwd: tempDir,
    });

    // Find the extracted directory (GitHub adds prefix like "cli-main")
    const entries = await fsExtra.readdir(tempDir);
    const extractedDir = entries.find(
      (e) => e !== 'repo.tar.gz' && fsExtra.statSync(path.join(tempDir, e)).isDirectory()
    );

    if (!extractedDir) {
      throw new Error('Failed to find extracted template directory');
    }

    // Copy the specific template folder
    const templateSource = path.join(tempDir, extractedDir, TEMPLATES_DIR, templateName);

    if (!fsExtra.existsSync(templateSource)) {
      throw new Error(
        `Template '${templateName}' not found. The template may not be available yet.`
      );
    }

    await fsExtra.copy(templateSource, targetDir);
  } finally {
    // Cleanup temp directory
    await fsExtra.remove(tempDir).catch(() => {});
  }
}

/**
 * Copy template from local directory
 */
async function copyLocalTemplate(
  localTemplatesDir: string,
  templateName: string,
  targetDir: string
): Promise<void> {
  const templateSource = path.join(localTemplatesDir, templateName);

  if (!fsExtra.existsSync(templateSource)) {
    throw new Error(
      `Template '${templateName}' not found at ${templateSource}`
    );
  }

  await fsExtra.copy(templateSource, targetDir);
}

/**
 * Replace template variables in all files
 */
async function replaceVariables(
  dir: string,
  vars: Record<string, string>
): Promise<void> {
  const entries = await fsExtra.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules if somehow present
      if (entry.name === 'node_modules') continue;
      await replaceVariables(fullPath, vars);
    } else if (entry.isFile()) {
      // Read file content
      let content = await fsExtra.readFile(fullPath, 'utf-8');

      // Replace {{variable}} patterns
      for (const [key, value] of Object.entries(vars)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }

      // Write back
      await fsExtra.writeFile(fullPath, content);

      // Rename .template files (e.g., package.json.template -> package.json)
      if (entry.name.endsWith('.template')) {
        const newPath = fullPath.replace(/\.template$/, '');
        await fsExtra.rename(fullPath, newPath);
      }
    }
  }
}

/**
 * Run npm install in the target directory
 */
function runNpmInstall(targetDir: string): boolean {
  try {
    execSync('npm install', {
      cwd: targetDir,
      stdio: 'pipe',
      timeout: 120000, // 2 minute timeout
    });
    return true;
  } catch {
    return false;
  }
}

export const initCommand = new Command('init')
  .description('Initialize a new Castari agent project')
  .argument('[name]', 'Project name')
  .option('-t, --template <template>', 'Template to use')
  .option('-l, --list', 'List available templates')
  .action(async (name: string | undefined, options: { template?: string; list?: boolean }) => {
    // Handle --list flag
    if (options.list) {
      listTemplates();
      return;
    }

    // Require name
    if (!name) {
      error('Project name is required');
      blank();
      hint('Usage: cast init <name> [--template <template>]');
      hint('       cast init --list');
      process.exit(1);
    }

    // Resolve target directory and extract project name
    const targetDir = path.resolve(process.cwd(), name);
    const projectName = path.basename(targetDir);

    // Check if directory already exists
    if (fsExtra.existsSync(targetDir)) {
      error(`Directory '${projectName}' already exists`);
      hint('Choose a different name or remove the existing directory');
      process.exit(1);
    }

    // Select template
    let templateKey = options.template;

    if (!templateKey) {
      // Interactive template selection
      const response = await prompts({
        type: 'select',
        name: 'template',
        message: 'Select a template:',
        choices: Object.entries(TEMPLATES).map(([key, tmpl]) => ({
          title: `${chalk.cyan(key)} — ${tmpl.description}`,
          value: key,
        })),
      });

      if (!response.template) {
        // User cancelled
        info('Cancelled.');
        process.exit(0);
      }

      templateKey = response.template;
    }

    // Validate template
    if (!templateKey || !TEMPLATES[templateKey]) {
      error(`Unknown template '${templateKey ?? 'undefined'}'`);
      hint("Run 'cast init --list' to see available templates");
      process.exit(1);
    }

    // At this point templateKey is guaranteed to be a valid template name
    const selectedTemplate = templateKey;

    // Create project from template
    const spinner = ora(
      `Creating ${chalk.cyan(projectName)} from ${chalk.cyan(selectedTemplate)} template...`
    ).start();

    try {
      // Check for local templates first (for development)
      const localTemplatesDir = getLocalTemplatesDir();

      if (localTemplatesDir) {
        await copyLocalTemplate(localTemplatesDir, selectedTemplate, targetDir);
      } else {
        await downloadTemplateFromGitHub(selectedTemplate, targetDir);
      }

      // Replace template variables
      await replaceVariables(targetDir, {
        name: projectName,
        version: '0.1.0',
      });

      spinner.succeed(`Created ${chalk.cyan(projectName)}/ from ${chalk.cyan(selectedTemplate)} template`);
    } catch (err) {
      spinner.fail('Failed to create project');
      if (err instanceof Error) {
        error(err.message);
      }
      // Clean up partial directory
      await fsExtra.remove(targetDir).catch(() => {});
      process.exit(1);
    }

    // Install dependencies
    const installSpinner = ora('Installing dependencies...').start();

    if (runNpmInstall(targetDir)) {
      installSpinner.succeed('Installed dependencies');
    } else {
      installSpinner.warn('Failed to install dependencies');
      hint("Run 'npm install' manually in the project directory");
    }

    // Print next steps
    blank();
    success('Project ready!');
    blank();
    header('Next steps:');
    console.log(`  ${chalk.cyan('cd')} ${projectName}`);
    console.log(`  ${chalk.cyan('cast deploy')}`);
    blank();
  });
