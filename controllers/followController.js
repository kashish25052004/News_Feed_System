const asyncHandler = require('../utils/asyncHandler');
const followService = require('../services/followService');

const followUser = asyncHandler(async (req, res) => {
  const follow = await followService.followUser(req.user._id, req.validated.params.userId);
  res.status(201).json({ follow });
});

const unfollowUser = asyncHandler(async (req, res) => {
  await followService.unfollowUser(req.user._id, req.validated.params.userId);
  res.status(204).send();
});

module.exports = {
  followUser,
  unfollowUser,
};
