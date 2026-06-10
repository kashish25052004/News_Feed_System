// Follow/Unfollow business logic.
const Feed = require('../models/Feed');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const User = require('../models/User');
const AppError = require('../utils/appError');

async function followUser(followerId, followingId) {
  if (followerId.toString() === followingId.toString()) {
    throw new AppError('Users cannot follow themselves', 400);
  }

  const targetUser = await User.findById(followingId);
  if (!targetUser) {
    throw new AppError('User to follow was not found', 404);
  }

  try {
    const follow = await Follow.create({ followerId, followingId });
    //promise.all -> wait for all promises to resolve. User.updateOne -> increment followingCount for followerId, increment followersCount for followingId. do parallel updates for better performance.
    //$inc -> atomic increment operator. ensures that even if multiple follow/unfollow actions happen concurrently, the counts remain accurate without race conditions.
    await Promise.all([
      User.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } }),
      User.updateOne({ _id: followingId }, { $inc: { followersCount: 1 } }),
    ]);
    return follow;
  } catch (error) {
    // MongoDB duplicate key error code -> 11000. This can happen if the same follow relationship is attempted to be created multiple times concurrently.
    if (error.code === 11000) {
      throw new AppError('Already following this user', 409); // 409 Conflict
    }
    throw error;
  }
}

async function unfollowUser(followerId, followingId) {
  const deleted = await Follow.findOneAndDelete({ followerId, followingId });// follow relationship is deleted
  if (!deleted) {
    throw new AppError('Follow relationship was not found', 404);
  }

  await Promise.all([
    User.updateOne({ _id: followerId }, { $inc: { followingCount: -1 } }),//user's followingCount is decremented by 1
    User.updateOne({ _id: followingId }, { $inc: { followersCount: -1 } }),//target user's followersCount is decremented by 1
  ]);

  // Remove pushed entries from the unfollowed author so future push feeds stay personalized.
  //   Delete records whose
  // postId is any of these.
  const authorPosts = await Post.find({ authorId: followingId }).select('_id');//post related to the unfollowed user is fetched. 
  await Feed.deleteMany({ userId: followerId, postId: { $in: authorPosts.map((post) => post._id) } });//feed entries related to those posts are deleted from the follower's feed. This ensures that the unfollowed user's posts no longer appear in the follower's feed, maintaining a personalized experience.

  return deleted;
}

module.exports = {
  followUser,
  unfollowUser,
};
