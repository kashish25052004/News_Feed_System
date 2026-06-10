const express = require('express');

const feedController = require('../controllers/feedController');
const authenticate = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { feedSchemas } = require('../utils/validators');

const router = express.Router();
// authenticate: req.user = user, 
//validateRequest:
// req.validated.query = {
//   strategy:'push',
//   limit:20
// }
router.get('/', authenticate, validateRequest(feedSchemas.get), feedController.getFeed);
// router.get('/paginated', authenticate, validateRequest(feedSchemas.get), feedController.getPaginatedFeed);

module.exports = router;
