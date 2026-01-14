import { Command } from 'commander';
import ora from 'ora';
import open from 'open';
import { createServer } from 'node:http';
import { saveCredentials, CastariClient, getApiUrl } from '@castari/sdk';
import { success, error, info } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Find an available port for the local callback server
 */
async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to find available port'));
      }
    });
    server.on('error', reject);
  });
}

/**
 * Start a local server to receive the OAuth callback
 */
async function startCallbackServer(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Login timed out. Please try again.'));
    }, 120000); // 2 minute timeout

    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
        const errorParam = url.searchParams.get('error');

        if (errorParam) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1 style="color: #e53e3e;">Login Failed</h1>
                  <p>${errorParam}</p>
                  <p>You can close this window.</p>
                </div>
              </body>
            </html>
          `);
          clearTimeout(timeout);
          server.close();
          reject(new Error(errorParam));
          return;
        }

        if (token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1 style="color: #38a169;">Login Successful!</h1>
                  <p>You can close this window and return to the terminal.</p>
                </div>
              </body>
            </html>
          `);
          clearTimeout(timeout);
          server.close();
          resolve(token);
          return;
        }
      }

      res.writeHead(404);
      res.end('Not found');
    });

    server.listen(port, () => {
      // Server is ready
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export const loginCommand = new Command('login')
  .description('Authenticate with Castari')
  .action(async () => {
    const spinner = ora('Preparing authentication...').start();

    try {
      // Find an available port for the callback
      const port = await findAvailablePort();
      spinner.text = 'Starting authentication server...';

      // Get the API URL
      const apiUrl = await getApiUrl();
      const authUrl = `${apiUrl}/api/v1/auth/cli/login?port=${port}`;

      // Start the callback server
      const tokenPromise = startCallbackServer(port);

      spinner.stop();
      info(`Opening browser for authentication...`);
      info(`If the browser doesn't open, visit: ${authUrl}`);

      // Open the browser
      await open(authUrl);

      spinner.start('Waiting for authentication...');

      // Wait for the callback
      const token = await tokenPromise;

      spinner.text = 'Saving credentials...';

      // Save the token
      await saveCredentials({ token });

      // Verify the token works by getting user info
      const client = new CastariClient({ token });
      const user = await client.auth.me();

      spinner.succeed(`Logged in as ${user.email}`);
    } catch (err) {
      spinner.fail('Login failed');
      handleError(err);
    }
  });
