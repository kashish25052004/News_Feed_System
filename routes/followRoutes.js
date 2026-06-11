const express = require('express');

const followController = require('../controllers/followController');
const authenticate = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { followSchemas } = require('../utils/validators');

const router = express.Router();

//after authentication, req.user = user, 
//after validateRequest, req.validated = { body, params, query } -> req.validated.params.userId
router.post('/:userId', authenticate, validateRequest(followSchemas.byUserId), followController.followUser);

//Deletes Follow record
// ↓
// Updates counters 
// ↓
// Removes feed entries
router.delete('/:userId', authenticate, validateRequest(followSchemas.byUserId), followController.unfollowUser);

module.exports = router;

//Follower = Logged-in User
// Following = URL User
