/**
 * Base error class for all Castari SDK errors
 */
export class CastariError extends Error {
  /** Error code from the API */
  code?: string;
  /** HTTP status code */
  statusCode?: number;

  constructor(message: string, options?: { code?: string; statusCode?: number }) {
    super(message);
    this.name = 'CastariError';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
  }
}

/**
 * Error thrown when authentication fails or is missing
 */
export class AuthenticationError extends CastariError {
  constructor(message = 'Authentication failed. Run \'cast login\' to authenticate.') {
    super(message, { statusCode: 401 });
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends CastariError {
  constructor(message = 'Resource not found.') {
    super(message, { statusCode: 404 });
    this.name = 'NotFoundError';
  }
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends CastariError {
  constructor(message = 'Validation error.') {
    super(message, { statusCode: 422 });
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends CastariError {
  /** Seconds to wait before retrying */
  retryAfter?: number;

  constructor(message = 'Rate limit exceeded.', retryAfter?: number) {
    super(message, { statusCode: 429 });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error thrown when the API returns a bad request
 */
export class BadRequestError extends CastariError {
  constructor(message = 'Bad request.') {
    super(message, { statusCode: 400 });
    this.name = 'BadRequestError';
  }
}

/**
 * Error thrown for server-side errors
 */
export class ServerError extends CastariError {
  constructor(message = 'Server error. Please try again later.') {
    super(message, { statusCode: 500 });
    this.name = 'ServerError';
  }
}
