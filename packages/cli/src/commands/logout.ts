import { Command } from 'commander';
import { clearCredentials } from '@castari/sdk';
import { success } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export const logoutCommand = new Command('logout')
  .description('Clear stored credentials')
  .action(async () => {
    try {
      await clearCredentials();
      success('Logged out successfully');
    } catch (err) {
      handleError(err);
    }
  });
