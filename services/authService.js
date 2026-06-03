//authentication business logic

//Password Hashing
//Simple Hashing
//Same Input = Same Output
// Suppose attacker already knows:
// hello123 → a6f9...
// Now if they see:
// a6f9...
// in database,
// they immediately know:
// Password = hello123
// This is called a rainbow table attack.
// bcrypt Solution: Salt

// Before hashing, bcrypt creates a random string called a salt.
// bcrypt output string
//     ↓
// contains
//     ↓
// Version + Cost + Salt + Hash
// salt -> It's encoded into a text format that bcrypt understands.

//register
// Password
//    ↓
// Add Random Salt
//    ↓
// Make Hashing Expensive
//    ↓
// Store Hash

//login
// Entered Password
//    ↓
// Extract Salt From Stored Hash
//    ↓
// Hash Again the entered password
//    ↓
// Compare both password hashes




const bcrypt = require('bcryptjs');

//Token Generation
const jwt = require('jsonwebtoken');


//MongoDB  user collection.
const User = require('../models/User');

// 401 Unauthorized
// 404 Not Found
// 400 Validation Error
const AppError = require('../utils/appError');


// Take User
//  ↓
// Generate JWT
function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  // sub
  // =
  // Subject
  // =
  // Who owns this token?

  //   user._id =
  // "6841d5b7a3b7f0e123456789"

  // Payload becomes:

  // {
  //   sub:
  //  "6841d5b7a3b7f0e123456789"
  // }

  return jwt.sign({ sub: user.id || user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register({ username, email, password }) {
  //bcrypt.hash() takes the plain password and a salt rounds (12 in this case) and returns a hashed version of the password. The salt rounds determine how many times the hashing algorithm is applied, making it more secure but also more computationally expensive.
  //size of hashed password is always same regardless of the size of the input password. it is around 60 characters.
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({ username, email, password: hashedPassword });

  return {
    user,
    token: signToken(user),
  };
}

async function login({ email, password }) {
  //+password because in User model, password select is false by default.by default, password is not returned in queries. we need it here to compare with the provided password.
  const user = await User.findOne({ email }).select('+password');

  //why not give email not exist because it can be used to check if a email is registered or not. so we give generic message for both cases.so attacker cannot know if email is registered or not. it is a security best practice to prevent user enumeration attacks.
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  

  const matches = await bcrypt.compare(password, user.password);
  //   Do not reveal
  // whether email or password
  // was wrong.
  if (!matches) {
    throw new AppError('Invalid email or password', 401);
  }

  return {
    user,
    token: signToken(user),
  };
}

module.exports = {
  login,
  register,
};


// why use jwt ?
// Stateless authentication.
// Server doesn't need session storage.