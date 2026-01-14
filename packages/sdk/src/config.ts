import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/** Directory for Castari config files */
const CONFIG_DIR = join(homedir(), '.castari');

/** Path to credentials file */
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.yaml');

/** Path to config file */
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

/**
 * Credentials stored in ~/.castari/credentials.yaml
 */
export interface Credentials {
  token?: string;
  api_key?: string;
}

/**
 * Config stored in ~/.castari/config.yaml
 */
export interface Config {
  api_url?: string;
}

/**
 * Ensure the config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load credentials from ~/.castari/credentials.yaml
 */
export async function loadCredentials(): Promise<Credentials> {
  try {
    const content = await readFile(CREDENTIALS_FILE, 'utf-8');
    return parseYaml(content) || {};
  } catch {
    return {};
  }
}

/**
 * Save credentials to ~/.castari/credentials.yaml
 * File is created with mode 0600 for security
 */
export async function saveCredentials(credentials: Credentials): Promise<void> {
  await ensureConfigDir();
  const content = stringifyYaml(credentials);
  await writeFile(CREDENTIALS_FILE, content, { mode: 0o600 });
}

/**
 * Clear all stored credentials
 */
export async function clearCredentials(): Promise<void> {
  try {
    await rm(CREDENTIALS_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
}

/**
 * Load config from ~/.castari/config.yaml
 */
export async function loadConfig(): Promise<Config> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return parseYaml(content) || {};
  } catch {
    return {};
  }
}

/**
 * Save config to ~/.castari/config.yaml
 */
export async function saveConfig(config: Config): Promise<void> {
  await ensureConfigDir();
  const content = stringifyYaml(config);
  await writeFile(CONFIG_FILE, content, { mode: 0o644 });
}

/**
 * Get the API URL from config, env var, or default
 */
export async function getApiUrl(): Promise<string> {
  // Check env var first
  if (process.env.CASTARI_API_URL) {
    return process.env.CASTARI_API_URL;
  }

  // Check config file
  const config = await loadConfig();
  if (config.api_url) {
    return config.api_url;
  }

  // Default
  return 'https://web-13239-04c55b73-wp4aqyqk.onporter.run';
}

/**
 * Get the auth token or API key from env vars or config
 * Priority: CASTARI_API_KEY env var > credentials file
 */
export async function getAuth(): Promise<{ type: 'api_key' | 'token'; value: string } | null> {
  // Check env var first (for CI/CD)
  const apiKey = process.env.CASTARI_API_KEY;
  if (apiKey) {
    return { type: 'api_key', value: apiKey };
  }

  // Check credentials file
  const credentials = await loadCredentials();
  if (credentials.api_key) {
    return { type: 'api_key', value: credentials.api_key };
  }
  if (credentials.token) {
    return { type: 'token', value: credentials.token };
  }

  return null;
}
