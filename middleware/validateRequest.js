const AppError = require('../utils/appError');

//What is being returned? A middleware function.

function validateRequest(schema) {
  //url -> /auth/register
  //req.body -> {username,email,password}
  // Request body:

  // {
  //   "username":"kashish",
  //   "email":"k@gmail.com",
  //   "password":"12345678"
  // }
  return (req, res, next) => {
  //   What is safeParse?

  // Think:

  // Check if data follows the rules.
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      //This converts Zod errors into a cleaner format.
      //Suppose Zod gives: path:["body","email"],message:"Invalid email"
      //We convert it into: {path:"body.email",message:"Invalid email"}
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      //Pass control to next middleware.
      //Something failed.
        // Go to error handler
      return next(new AppError('Invalid request payload', 400, details));
    }
//     Instead of using:

// req.body

// later,

// controller can use:

// req.validated

// which is already cleaned and validated. example if user give email as "email":"KASHISH@GMAIL.COM" validator convert it into lowercase

    req.validated = result.data;
//     Validation passed.
// Continue to next middleware.
    return next();
  };
}

module.exports = validateRequest;
