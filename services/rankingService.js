// Without ranking:
// Newest Post First

// With ranking:
// Best Post First

const Follow = require('../models/Follow');

//Fresh posts > Popular posts > Relationship
const RECENCY_WEIGHT = 0.65;
const LIKE_WEIGHT = 0.25;
const INTERACTION_WEIGHT = 0.1;
const RECENCY_HALF_LIFE_HOURS = 24;

// Fast decay. -> exponential decay 

// This strongly favors recent content.
function calculateRecencyScore(createdAt) {
  // divide by 36e5 -> convert Milliseconds into hours
  const ageHours = Math.max((Date.now() - new Date(createdAt).getTime()) / 36e5, 0);
  // example  ageHours = 0 -> score = 1 -> maximum score, ageHours = 24 -> exp(-1) -> score = 0.367879, ageHours = 48 -> exp(-2) -> score = 0.135335 ,
  return Math.exp(-ageHours / RECENCY_HALF_LIFE_HOURS);
}

// Raw like counts can dominate the ranking. Using logarithmic scaling reduces the impact of very large like counts and keeps the ranking balanced.
function calculateLikesScore(likesCount) {
  //example: likesCount = 0 -> score = 0, likesCount = 10 -> score = 0.239, likesCount = 100 -> score = 0.461, likesCount = 10000 -> score = 0.921
  return Math.log1p(likesCount || 0) / 10;
}

async function getInteractionScore(viewerId, authorId) {
  if (!viewerId || !authorId) {
    return 0;
  }

  const followsAuthor = await Follow.exists({ followerId: viewerId, followingId: authorId });
  return followsAuthor ? 1 : 0;
}

async function scorePost(post, viewerId) {
  const recencyScore = calculateRecencyScore(post.createdAt);
  const likesScore = calculateLikesScore(post.likesCount);
  const interactionScore = await getInteractionScore(viewerId, post.authorId);

  return Number(
    (
      recencyScore * RECENCY_WEIGHT +
      likesScore * LIKE_WEIGHT +
      interactionScore * INTERACTION_WEIGHT
    ).toFixed(6),//up to 6 decimal places for better precision
  );
}

//This is where all posts get scored.
async function rankPosts(posts, viewerId) {
  //promise.all -> wait for all promises to resolve. posts.map -> for each post, calculate score asynchronously. result is an array of objects with post and its score.
  //why promise.all -> because getInteractionScore is asynchronous, we need to wait for all scores to be calculated before sorting.

  //   Without Promise.all:

  // Post1 score
  //       ↓
  // wait
  //       ↓
  // Post2 score
  //       ↓
  // wait
  //       ↓
  // Post3 score

  // Sequential.

  //   With Promise.all:

  // Post1
  // Post2
  // Post3

  // all score calculations start together.
  const scoredPosts = await Promise.all(
    posts.map(async (post) => ({
      post,
      score: await scorePost(post, viewerId),
    })),
  );

  return scoredPosts.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
  });
}

module.exports = {
  rankPosts,
  scorePost,
};
