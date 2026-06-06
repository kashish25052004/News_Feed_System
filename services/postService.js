// How to create a post?
// How to like a post?
// How to get trending posts?
// How to fetch a post?



const Post = require('../models/Post');
const AppError = require('../utils/appError');
const { buildLikesCursorFilter, encodeCursor } = require('../utils/cursor');
const { pushPostToFollowers } = require('./feedService');



// Kashish posts
//      ↓
// 100 followers
//      ↓
// Create 100 feed entries
//      ↓
// Then return response to user.
async function createPost(authorId, { content }) {
  const post = await Post.create({ authorId, content });

  // Push feed is synchronous by requirement: the write path pays the fanout cost.
  //   Post creation
  //  waits until
  //  fanout completes
  await pushPostToFollowers(post, authorId);

  //   {
  //  authorId:{
  //    username:"kashish",
  //    followersCount:100
  //  }
  // }

  //   Second parameter means:

  // Fetch only these fields
  return post.populate('authorId', 'username followersCount');
}

async function getPostById(postId) {
  const post = await Post.findById(postId).populate('authorId', 'username followersCount');
  if (!post) {
    throw new AppError('Post not found', 404);
  }
  return post;
}

// What is $inc ?
//is atomic. - > it means:The operation happens completely in one step.No other operation can interfere in between.
// Mongo operator.Increment operator. Atomically increments a field by a specified value. In this case, it increments likesCount by 1.
// Why not read-modify-write?

// Bad:

// post.likesCount++;

// await post.save();

// Problem:

// User A likes
// User B likes
// Same time

// Race condition.

async function likePost(postId) {
  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { likesCount: 1 } },

    //Return updated document
    // instead of old document.
    { new: true, runValidators: true },
  ).populate('authorId', 'username followersCount');

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  return post;
}

async function getTrendingPosts({ limit, cursor }) {
  const pageSize = Number(limit || 20);
  const hours = Number(process.env.TRENDING_WINDOW_HOURS || 48);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const cursorFilter = buildLikesCursorFilter(cursor);

    //   $gte
    // Means:
    // Greater Than Or Equal
    //...cursorFilter - > Copy all properties of cursorFilter here
  const posts = await Post.find({ createdAt: { $gte: since }, ...cursorFilter }) //...cursorFlter -> This is JavaScript's spread operator.
    .populate('authorId', 'username followersCount')
    .sort({ likesCount: -1, createdAt: -1, _id: -1 })
    .limit(pageSize + 1); // Fetch one extra to check if there's a next page.

  const page = posts.slice(0, pageSize);// Return only the requested page size.
  const last = page[page.length - 1];// Get the last post in the page to create the next cursor.

  return {
    items: page,
    nextCursor:
      posts.length > pageSize
        ? encodeCursor({ score: last.likesCount, createdAt: last.createdAt, id: last._id.toString() })
        : null,
  };
}

module.exports = {
  createPost,
  getPostById,
  getTrendingPosts,
  likePost,
};
