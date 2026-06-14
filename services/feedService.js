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

// Step 1:
// Get Push Feed
// (from Feed collection)

// Step 2:
// Get Celebrity Posts
// (from Post collection)

// Step 3:
// Rank Celebrity Posts

// Step 4:
// Merge both

// Step 5:
// Sort Again

// Step 6:
// Return final feed

async function getHybridFeed(userId, options = {}) {
  const pageSize = normalizeLimit(options.limit);
  const threshold = getCelebrityThreshold();
  const follows = await Follow.find({ followerId: userId }).select('followingId');
  const followingIds = follows.map((follow) => follow.followingId);

  if (followingIds.length === 0) {
    return { strategy: 'hybrid', items: [], nextCursor: null };
  }

  const celebrities = await User.find({
    _id: { $in: followingIds },
    followersCount: { $gte: threshold },
  }).select('_id');
  const celebrityIds = celebrities.map((user) => user._id);

  //getpushfeed and post.fond work together parallely
  const [pushFeed, celebrityPosts] = await Promise.all([
    getPushFeed(userId, { limit: pageSize * 2 }),
    Post.find({ authorId: { $in: celebrityIds } })
      .populate('authorId', 'username followersCount')
      .sort({ createdAt: -1, _id: -1 })
      .limit(pageSize * 5), // why *5 bacause imagine pagesize = 20 ,post num 20 is having a score of 0.5 , and post num 25 having a score of 0.8 , if we take only pagesize num of post then we miss some posts of which has high score 
      //as inside post we are not able to save the score , as post has one author, diffrent post , diffrent score based on diffrent viwerid 
  ]);
  //push logic main toh feed main score already rehta hai , but pull ke liye hum quesry post schema se karte hai and vaha score nhi nikala ja sakta hai thats why pull karne ke bad ranking karni hogi
  const rankedCelebrityPosts = await rankPosts(celebrityPosts, userId);

  // Why use Map? Because: One key can exist only once.
  const mergedByPostId = new Map(); // just like map in c++


  pushFeed.items.forEach((item) => {
    if (item.post) {
      mergedByPostId.set(item.post.id || item.post._id.toString(), item);
    }
  });

  rankedCelebrityPosts.forEach(({ post, score }) => {
    mergedByPostId.set(post._id.toString(), { post, score, createdAt: post.createdAt });
  });

  // Because Map stores:key -> value
  //we need values, so we use array , convert map to array
  const merged = Array.from(mergedByPostId.values()).sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filtered = merged.filter((item) =>
    isAfterScoreCursor(
      {
        score: item.score,
        createdAt: item.createdAt,
        id: item.id || item.post.id || item.post._id,
      },
      options.cursor,
    ),
  );

  const page = filtered.slice(0, pageSize);
  const last = page[page.length - 1];

  return {
    strategy: 'hybrid',
    items: page,
    nextCursor:
      filtered.length > pageSize
        ? encodeCursor({
            score: last.score,
            createdAt: last.createdAt,
            id: last.id || last.post.id || last.post._id.toString(),
          })
        : null,
  };
}

async function getFeed(userId, strategy, options = {}) {
  if (strategy === 'pull') {
    return getPullFeed(userId, options);
  }

  if (strategy === 'push') {
    return getPushFeed(userId, options);
  }

  return getHybridFeed(userId, options);
}

module.exports = {
  getFeed,
  getHybridFeed,
  getPullFeed,
  getPushFeed,
  pushPostToFollowers,
};


// operations

// is not inserting anything.

// It is only building instructions.

// Like:

// Instruction 1:
// Update Kashish feed

// Instruction 2:
// Update Amit feed

// Instruction 3:
// Update Rohit feed

// Then:

// Feed.bulkWrite(operations)

// actually sends all those instructions to MongoDB at once.


