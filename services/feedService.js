const Feed = require('../models/Feed');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const User = require('../models/User');
const { buildScoreCursorFilter, encodeCursor, isAfterScoreCursor } = require('../utils/cursor');
const { rankPosts, scorePost } = require('./rankingService');

const DEFAULT_PAGE_SIZE = Number(process.env.FEED_PAGE_SIZE || 20);

function getCelebrityThreshold() {
  return Number(process.env.CELEBRITY_FOLLOWER_THRESHOLD || 10000);
}

function normalizeLimit(limit) {
  return Number(limit || DEFAULT_PAGE_SIZE);
}

function serializeFeedItem(item) {
  const post = item.postId || item.post;
  return {
    id: item._id?.toString(),
    post,
    score: item.score,
    createdAt: item.createdAt,
  };
}

// user schema
//    |
// follow schema
//    |
// 

async function pushPostToFollowers(post, authorId, session = null) {
  const author = await User.findById(authorId).select('followersCount').session(session);
  if (author && author.followersCount >= getCelebrityThreshold()) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `Skipping push fanout for celebrity author=${authorId} followers=${author.followersCount} threshold=${getCelebrityThreshold()}`,
      );
    }
    return { insertedCount: 0, skippedReason: 'celebrity_author' };
  }

  const followers = await Follow.find({ followingId: authorId }).select('followerId').session(session);
  if (followers.length === 0) {
    return { insertedCount: 0 };
  }

  //One feed entry for every follower.
  //why update one not insert one 
  // because upsert: true is used
  // so
  // If document exists
  // update it.

//   Think of upsert like this
// Find document

// Found?
//    ↓
//  YES → Update

//  NO
//    ↓
//  Insert

  // If not
  // insert it.
   //Why Promise.all ? Inside map:
    // await scorePost(
    //  post,
    //  followerId
    // )

// is asynchronous. 
//.map -> will run once for each follower.
//After Promise.all: we get array which is fully resolved with scores for each follower. We can then pass this array of operations to Feed.bulkWrite to efficiently perform all the upsert operations in one go. This approach allows us to handle a large number of followers without blocking the event loop, as the scoring of posts for each follower can be done in parallel.
  
// Phase 1:
// Build operations array
const operations = await Promise.all(
    followers.map(async ({ followerId }) => ({
      updateOne: {
        filter: { userId: followerId, postId: post._id },
        update: {
          //If document already exists: Don't touch these fields.
          $setOnInsert: {
            userId: followerId,
            postId: post._id,
            createdAt: post.createdAt,
          },
          //Always update score. Why? Suppose likes increase. Ranking changes. Need new score.
          $set: {
            score: await scorePost(post, followerId),
          },
        },
        upsert: true,
      },
    })),
  );
// into the Feed this operation will either insert a new document for the follower if it doesn't exist, or update the existing document's score if it does exist. This ensures that each follower's feed is updated with the new post and its relevance score without creating duplicate entries.
  
// Phase 2:
// Execute operations array
const result = await Feed.bulkWrite(operations, { ordered: false, session });
  return { insertedCount: result.upsertedCount || 0 };
}

async function getPushFeed(userId, { cursor, limit } = {}) {
  const pageSize = normalizeLimit(limit);
  const cursorFilter = buildScoreCursorFilter(cursor);

  const feedEntries = await Feed.find({ userId, ...cursorFilter })
    .populate({
      path: 'postId',
      populate: { path: 'authorId', select: 'username followersCount' },
    })
    .sort({ score: -1, createdAt: -1, _id: -1 })
    .limit(pageSize + 1);// +1 because we need one extra item to determine if there is a next page or not.

  const page = feedEntries.slice(0, pageSize);
  const last = page[page.length - 1];

  return {
    strategy: 'push',
    items: page.map(serializeFeedItem),
    nextCursor:
      feedEntries.length > pageSize
        ? encodeCursor({ score: last.score, createdAt: last.createdAt, id: last._id.toString() })
        : null,
  };
}


// Follow Collection
// ↓
// Post Collection
// ↓
// Ranking

//followerid = user id who is reading the feed. We want to rank posts based on relevance to this user.
//Feed generated when user opens app
async function getPullFeed(userId, { cursor, limit } = {}) {
  const pageSize = normalizeLimit(limit);
  const follows = await Follow.find({ followerId: userId }).select('followingId');
  const followingIds = follows.map((follow) => follow.followingId);

  if (followingIds.length === 0) {
    return { strategy: 'pull', items: [], nextCursor: null };
  }

  // Pull mode ranks a bounded candidate set in application memory. For SDE-1 scale this is easier
  // to reason about than maintaining precomputed timelines for every read.
  const candidates = await Post.find({ authorId: { $in: followingIds } })
    .populate('authorId', 'username followersCount')
    .sort({ createdAt: -1, _id: -1 }) // Newest posts first.
    .limit(pageSize * 10); // why * 10 because we use post schema and in that score in not there ,so we sort by createdAt and id , toh jyada fetch karo taki jyada score wale mil sake.

  const ranked = await rankPosts(candidates, userId);
  //Ranking happened inside Node.js memory. Not MongoDB. -> that's why use isAfterScoreCursor
  const filtered = ranked.filter(({ post, score }) =>
    isAfterScoreCursor({ score, createdAt: post.createdAt, id: post._id }, cursor), // this is the cursor , iske baad wale konse posts aana chhaiye voh dedo
  );

  const page = filtered.slice(0, pageSize);
  const last = page[page.length - 1];

  return {
    strategy: 'pull',
    items: page.map(({ post, score }) => ({ post, score, createdAt: post.createdAt })),
    nextCursor:
      filtered.length > pageSize
        ? encodeCursor({ score: last.score, createdAt: last.post.createdAt, id: last.post._id.toString() })
        : null,
  };
}




