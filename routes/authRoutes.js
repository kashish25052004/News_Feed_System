const express = require('express');

const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { authSchemas } = require('../utils/validators');

// Create a small route manager for auth-related routes.

// Like creating a separate department:

// Auth Department

const router = express.Router();

// User wants to register
//         ↓
// Check if data is valid
//         ↓
// If valid → create user

router.post('/register', validateRequest(authSchemas.register), authController.register);
router.post('/login', validateRequest(authSchemas.login), authController.login);

module.exports = router;
