// ✅ Corrected ErrorHandler Class
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message =
    typeof err.message === "string" ? err.message : "Internal Server Error";

  console.error("ERROR:", err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate ${field} entered. Please use a different value.`;
    statusCode = 400;
  }

  if (err.name === "JsonWebTokenError") {
    message = "Invalid token. Please log in again.";
    statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    message = "Your token has expired. Please log in again.";
    statusCode = 401;
  }

  if (err.name === "CastError") {
    message = `Invalid ID format: ${err.path}`;
    statusCode = 400;
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((val) => val.message);
    message = `Validation Error: ${messages.join(". ")}`;
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default ErrorHandler;
