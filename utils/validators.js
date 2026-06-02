//purpose: Check whether incoming request data is valid.


//zod is a validation library.
const { z } = require('zod');
//MongoDB IDs look like:

// 6841d5b7a3b7f0e123456789

// 24 characters.

// This validator says:

// Must be a string
// Must contain exactly 24 hex characters
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

//.string()
// /feed?limit=10
// Even though 10 looks like a number,
// Express receives:
// req.query.limit
// as:"10"(string)

// .optional()
// means:
// limit is not mandatory
// These are both okay:
// /feed
// /feed?limit=10

const positiveLimit = z
  .string()
  .optional()
  //Converts:"10"into:10(number)
  .transform((value) => (value ? Number(value) : undefined))
  //Must be integer Must be > 0 Must be <= 100
  .refine((value) => value === undefined || (Number.isInteger(value) && value > 0 && value <= 100), {
    message: 'limit must be an integer between 1 and 100',
  });

const authSchemas = {
  //Expected structure of register request -> object
  register: z.object({
    body: z.object({
// Must be string
// Remove spaces
// Minimum 3 chars
// Maximum 30 chars
// Only letters numbers underscore
      username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),

//       Must be email
// Convert to lowercase
      email: z.string().trim().email().toLowerCase(),
      password: z.string().min(8).max(72),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),
  }),
  login: z.object({
    body: z.object({
      email: z.string().trim().email().toLowerCase(),
      password: z.string().min(1),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),
  }),
};

const postSchemas = {
  create: z.object({
    body: z.object({
      content: z.string().trim().min(1).max(500),
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional(),
  }),
//   Suppose route:

// GET /posts/6841d5b7a3b7f0e123456789

// Express stores:

// req.params.id
  byId: z.object({
    body: z.object({}).optional(),
    params: z.object({ id: objectId }),
    query: z.object({}).optional(),
  }),

//   Example:

// /posts/trending?limit=20

// Checks:

// limit exists?
// If yes, must be between 1 and 100
  trending: z.object({
    body: z.object({}).optional(),
    params: z.object({}).optional(),
    query: z.object({ limit: positiveLimit }),
  }),
};

const followSchemas = {
  byUserId: z.object({
    body: z.object({}).optional(),
    params: z.object({ userId: objectId }),
    query: z.object({}).optional(),
  }),
};

// ? ke baad ka query hota hai 
const feedSchemas = {
  get: z.object({
    body: z.object({}).optional(),
    params: z.object({}).optional(),
    query: z.object({
      strategy: z.enum(['push', 'pull', 'hybrid']).optional(),
      cursor: z.string().optional(),
      limit: positiveLimit,
    }),
  }),
};

module.exports = {
  authSchemas,
  feedSchemas,
  followSchemas,
  postSchemas,
};
