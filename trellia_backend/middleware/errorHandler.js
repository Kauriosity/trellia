/**
 * Centralized error handling middleware.
 */
const errorHandler = (error, request, response, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode}: ${message}`);
  if (error.stack) {
    console.error(error.stack);
  }

  response.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message,
    // stack: process.env.NODE_ENV === 'production' ? null : error.stack,
  });
};

module.exports = errorHandler;
