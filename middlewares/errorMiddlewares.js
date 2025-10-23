// server/middlewares/errorMiddlewares.js
export const errorMiddleware = (err, req, res, next) => {
  let statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  let message = typeof err.message === "string" ? err.message : "Internal Server Error";

  console.error("[ERROR]", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    keyValue: err.keyValue,
  });

  // Handle duplicate key errors (MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `Duplicate ${field} entered. Please use a different value.`;
    statusCode = 400;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    message = "Invalid token. Please log in again.";
    statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    message = "Your token has expired. Please log in again.";
    statusCode = 401;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    message = `Invalid ID format: ${err.path}`;
    statusCode = 400;
  }

  // Handle Mongoose validation errors
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
