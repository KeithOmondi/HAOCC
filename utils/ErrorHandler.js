// server/utils/ErrorHandler.js
class ErrorHandler extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Flag for known operational errors
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorHandler;
