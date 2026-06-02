//app.js answers: When a request comes, how should it be handled?

//Load env variables

require('dotenv').config();

//Import packages

const cors = require('cors');
const express = require('express');
//
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const feedRoutes = require('./routes/feedRoutes');
const followRoutes = require('./routes/followRoutes');
const postRoutes = require('./routes/postRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

//Create Express app
const app = express();

// Add middleware
//Security, CORS, JSON parsing, logging, and rate limiting

//Adds protective HTTP headers.
app.use(helmet());
//Enables CORS for all routes, allowing cross-origin requests.Frontend:localhost:5173, Backend:localhost:3000, Browser sees: Different Origins and blocks request.CORS says:It's okay. Allow frontend to talk to backend.
app.use(cors());
// User sends:

// {
//   "email":"abc@gmail.com"
// }

// Without this middleware:

// req.body

// is:

// undefined

// With this middleware:

// req.body.email

// works.

// limit: '1mb'

// Maximum request body size.

// Protects from huge payloads.
app.use(express.json({ limit: '1mb' }));

//Morgan logs requests. In production, it uses 'combined' format, which is more detailed. In development, it uses 'dev' format, which is concise and color-coded.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// 300 requests allowed
// per IP
// per 15 minutes
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

//Register routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/follow', followRoutes);
app.use('/feed', feedRoutes);

//Register error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Export app for server.js to use
module.exports = app;
