
// raw request
//   |
// validation middle ware
//   |
// clean request
//   |
// req.validated

// Controller does NOT do the work.
// Controller delegates the work.

// req.validated.body

// contains:

// {
//   username:"kashish",
//   email:"k@gmail.com",
//   password:"12345678"
// }

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

// Why wrap with asyncHandler?
//Without:
//Every controller needs try/catch.
//With:
// Errors automatically go to:

// Error Middleware

// through:

// .catch(next)
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);
  res.json(result);
});


module.exports = {
  login,
  register,
};
