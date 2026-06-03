// Instead of:

// .catch((error)=>{
//    next(error);
// })

// you can write:

// .catch(next)

// Controller
//     ↓
// Error occurs
//     ↓
// .catch(next)
//     ↓
// next(error)
//     ↓
// Express detects error
//     ↓
// errorHandler(err,req,res,next)
//     ↓
// Response sent

//take function as argument and return a new function that wraps the original function in a try-catch block. If any error occurs, it will be caught and passed to the next middleware (which is the error handler).
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
