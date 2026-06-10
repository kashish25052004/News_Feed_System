const asyncHandler = require('../utils/asyncHandler');
const feedService = require('../services/feedService');

//GET /feed?strategy=push&limit=20
const getFeed = asyncHandler(async (req, res) => {
  const { strategy = 'hybrid', cursor, limit } = req.validated.query;
  const result = await feedService.getFeed(req.user._id, strategy, { cursor, limit });
  res.json(result);
});

const getPaginatedFeed = asyncHandler(async (req, res) => {
  const { strategy = 'hybrid', cursor, limit } = req.validated.query;
  const result = await feedService.getFeed(req.user._id, strategy, { cursor, limit });
  res.json(result);//Return feed to frontend.
});

module.exports = {
  getFeed,
  getPaginatedFeed,
};
