import {
  CastariError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  BadRequestError,
} from '@castari/sdk';
import { error, hint } from './output.js';

/**
 * Handle an error and display a user-friendly message
 * Exits the process with code 1
 */
export function handleError(err: unknown): never {
  if (err instanceof AuthenticationError) {
    error('Authentication failed');
    hint("Run 'cast login' to authenticate");
  } else if (err instanceof NotFoundError) {
    error(err.message || 'Resource not found');
    hint("Run 'cast agents list' to see your agents");
  } else if (err instanceof RateLimitError) {
    error('Rate limit exceeded');
    if (err.retryAfter) {
      hint(`Try again in ${err.retryAfter} seconds`);
    } else {
      hint('Try again in a few moments');
    }
  } else if (err instanceof ValidationError) {
    error(`Validation error: ${err.message}`);
  } else if (err instanceof BadRequestError) {
    error(`Bad request: ${err.message}`);
  } else if (err instanceof CastariError) {
    error(err.message);
  } else if (err instanceof Error) {
    error(err.message);
  } else {
    error('An unexpected error occurred');
  }

  process.exit(1);
}
