// Controller's job:

// 1. Read request data
// 2. Call service
// 3. Send response

const asyncHandler = require('../utils/asyncHandler');
const postService = require('../services/postService');

// Where does req.user come from?auth middleware:
// Where does req.validated.body come from?Validation middleware.
//201 -> New Post Created
const createPost = asyncHandler(async (req, res) => {
  const post = await postService.createPost(req.user._id, req.validated.body);
  res.status(201).json({ post });
});

const getPostById = asyncHandler(async (req, res) => {
  const post = await postService.getPostById(req.validated.params.id);
  res.json({ post });
});

const likePost = asyncHandler(async (req, res) => {
  const post = await postService.likePost(req.validated.params.id);
  res.json({ post });
});

//validation middleware -> convert limit (string) to integer in req.validated.query 
const getTrendingPosts = asyncHandler(async (req, res) => {
  const result = await postService.getTrendingPosts(req.validated.query);
  res.json(result);
});

module.exports = {
  createPost,
  getPostById,
  getTrendingPosts,
  likePost,
};
