/**
 * AppError - Custom error class for handling application-specific errors with additional context.
 * This class can be extended in the future to include additional properties or methids if needed
 */

class AppError extends Error {
  constructor(message, statusCode = 500, error = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = error;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
