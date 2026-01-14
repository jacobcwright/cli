import { describe, it, expect } from 'vitest';
import {
  CastariError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  BadRequestError,
  ServerError,
} from '../errors.js';

describe('Error Classes', () => {
  it('CastariError should have correct properties', () => {
    const error = new CastariError('Test error', { code: 'TEST', statusCode: 400 });
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('CastariError');
    expect(error instanceof Error).toBe(true);
  });

  it('AuthenticationError should have 401 status', () => {
    const error = new AuthenticationError();
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toContain('Authentication failed');
  });

  it('NotFoundError should have 404 status', () => {
    const error = new NotFoundError('Agent not found');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Agent not found');
  });

  it('ValidationError should have 422 status', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(422);
    expect(error.name).toBe('ValidationError');
  });

  it('RateLimitError should have 429 status and retryAfter', () => {
    const error = new RateLimitError('Too many requests', 60);
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(60);
    expect(error.name).toBe('RateLimitError');
  });

  it('BadRequestError should have 400 status', () => {
    const error = new BadRequestError('Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('BadRequestError');
  });

  it('ServerError should have 500 status', () => {
    const error = new ServerError();
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('ServerError');
  });

  it('All errors should be instanceof CastariError', () => {
    expect(new AuthenticationError() instanceof CastariError).toBe(true);
    expect(new NotFoundError() instanceof CastariError).toBe(true);
    expect(new ValidationError() instanceof CastariError).toBe(true);
    expect(new RateLimitError() instanceof CastariError).toBe(true);
    expect(new BadRequestError() instanceof CastariError).toBe(true);
    expect(new ServerError() instanceof CastariError).toBe(true);
  });
});
