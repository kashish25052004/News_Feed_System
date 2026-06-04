// This file is the central error management system of your application.
// Without errorMiddleware

// Validation Error → Different format
// Mongo Error      → Different format
// JWT Error        → Different format

// Messy

const AppError = require('../utils/appError');

// "Route not found: GET /banana",

//  statusCode:404
function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  //This is usually from Mongoose.
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  //Duplicate Key Error MongoDB error. -> e.g. trying to create a user with an email that already exists.
  if (error.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate resource',
      fields: Object.keys(error.keyPattern || {}),
    });
  }

  //malformed ObjectId error from Mongoose when an invalid id is provided in the URL, e.g. /users/123 where 123 is not a valid ObjectId.
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource id' });
  }


  //   Why hide real error?
  // Security.
  // Don't expose:
  // Database names
  // Paths
  // Server internals to users.
  //that's why if error is expected (operational), we send the real message. If it's unexpected, we send a generic message to avoid leaking sensitive information.
  const payload = {
    message: error.isOperational ? error.message : 'Internal server error',
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && !error.isOperational) {
    payload.stack = error.stack;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
