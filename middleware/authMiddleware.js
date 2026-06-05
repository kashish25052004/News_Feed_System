
// Verify JWT
//       ↓
// Find User
//       ↓
// Attach User to req.user
//       ↓
// Allow Request

const jwt = require('jsonwebtoken');

const User = require('../models/User');
const AppError = require('../utils/appError');

async function authenticate(req, res, next) {
  try {

    //     Suppose frontend sends:
    // Authorization: Bearer abc.xyz.123
    const header = req.headers.authorization || '';

    //     Destructuring:

    // scheme = "Bearer"
    // token = "abc.xyz.123"
    const [scheme, token] = header.split(' ');

    //401-> Unauthorized
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Authentication token is required', 401);
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // in auth services we created token with payload as { sub: user.id || user._id.toString()  }

    const user = await User.findById(payload.sub);

    if (!user) {
      throw new AppError('Authenticated user no longer exists', 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      // Convert ugly JWT errors into:Much cleaner for frontend.
      //next(error) go to error handling middleware.
      return next(new AppError('Invalid or expired token', 401));
    }
    return next(error);
  }
}

module.exports = authenticate;


// Why query database? even we get id from payload.sub?
// Why not trust token directly?
// Imagine:
// User exists
//  ↓
// Gets token
//  ↓
// Account deleted

// Token still exists.

// Without DB check:

// Deleted user
// can still access API
// Bad.
