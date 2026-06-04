const express = require('express');

const postController = require('../controllers/postController');
// Check JWT
// Find User
// Attach User to req.user
const authenticate = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { postSchemas } = require('../utils/validators');

//Creates a mini route manager.
const router = express.Router();

//Why no authenticate? Anyone can see trending posts.No login required
router.get('/trending', validateRequest(postSchemas.trending), postController.getTrendingPosts);

//Creating a post requires: Knowing who created it
router.post('/', authenticate, validateRequest(postSchemas.create), postController.createPost);


// Express stores:
// req.params.id
router.get('/:id', validateRequest(postSchemas.byId), postController.getPostById);


router.post('/:id/like', authenticate, validateRequest(postSchemas.byId), postController.likePost);

module.exports = router;
