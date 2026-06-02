// purpose : Error
//    +
// Extra Information
// It's a custom error class.

// HTTP Status Code?--> 400 Bad Request, 404 Not Found, 500 Internal Server Error

// Extra Details
// Is this expected or unexpected?

//A normal Error doesn't store all that nicely.

// class AppError extends Error

// Meaning:

// Create my own Error type
// based on JavaScript's Error

// Think of inheritance like:

// Animal
//    ↓
// Dog

// Dog gets Animal's features.

// Similarly:

// Error
//    ↓
// AppError

// AppError gets everything from Error.

class AppError extends Error {

  constructor(message, statusCode = 500, details = undefined) {
//     Because AppError extends Error.

// We must initialize the parent Error class.
    super(message);
    this.statusCode = statusCode;
    this.details = details;

//     Expected errors.

// Examples:

// Invalid password
// User not found
// Validation failed
// Unauthorized access

// These are normal.

// Users make mistakes.

// This error is expected.
// Not a bug.

    this.isOperational = true;
  }
}

module.exports = AppError;

// Normal Error
//       ↓
// Not enough information

// AppError
//       ↓
// Message
// Status Code
// Details
// Operational Flag
