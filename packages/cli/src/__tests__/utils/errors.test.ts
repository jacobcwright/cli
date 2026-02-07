import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CastariError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  BadRequestError,
} from '@castari/sdk';
import { handleError } from '../../utils/errors.js';

describe('handleError', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock process.exit to prevent the test runner from exiting
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle AuthenticationError and print auth failure message', () => {
    handleError(new AuthenticationError());

    // error() from output.ts calls console.error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Authentication failed',
    );
    // hint() from output.ts calls console.log with the login suggestion
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("Run 'cast login' to authenticate"),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle NotFoundError and print not found message', () => {
    handleError(new NotFoundError('Agent not found'));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Agent not found',
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("Run 'cast agents list' to see your agents"),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle NotFoundError with default message', () => {
    handleError(new NotFoundError());

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Resource not found.',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle RateLimitError without retryAfter', () => {
    handleError(new RateLimitError());

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Rate limit exceeded',
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('Try again in a few moments'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle RateLimitError with retryAfter', () => {
    handleError(new RateLimitError('Rate limit exceeded.', 30));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Rate limit exceeded',
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('Try again in 30 seconds'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle ValidationError and print validation error message', () => {
    handleError(new ValidationError('Field "name" is required'));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Validation error: Field "name" is required',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle BadRequestError and print bad request message', () => {
    handleError(new BadRequestError('Invalid JSON body'));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Bad request: Invalid JSON body',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle generic CastariError and print its message', () => {
    handleError(new CastariError('Something went wrong'));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'Something went wrong',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle generic Error and print its message', () => {
    handleError(new Error('ECONNREFUSED'));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'ECONNREFUSED',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle unknown non-error values with unexpected error message', () => {
    handleError('some string');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'An unexpected error occurred',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle null with unexpected error message', () => {
    handleError(null);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.anything(),
      'An unexpected error occurred',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should always call process.exit(1)', () => {
    handleError(new Error('test'));
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
