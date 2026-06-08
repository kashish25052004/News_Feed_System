//is what makes a Push-based News Feed System.

// One Post
//       ↓
// Multiple Feed Rows
// This is called: Fanout or Fanout on Write


const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema(
  {
    //Whose feed is this?
    //userId: Kashish
    //This feed item belongs
    // to Kashish's timeline
    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    //Which post appears in the feed?
    //postId: RuhiPost id
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    //What is the score of this feed item?
    score: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Same post
// cannot appear twice
// in same user's feed.
feedSchema.index({ userId: 1, postId: 1 }, { unique: true });
// Query probably looks like:

// Feed.find({
//  userId:kashishId
// })
// .sort({
//  score:-1,
//  createdAt:-1
// });

feedSchema.index({ userId: 1, score: -1, createdAt: -1, _id: -1 });
feedSchema.index({ postId: 1 });

module.exports = mongoose.model('Feed', feedSchema);

// {
//  userId: Kashish id,
//  postId: RuhiPost id
// }

// Show Ruhi's post
// inside Kashish's feed

// Suppose:
// Rahul posts
// Post collection:

// {
//  postId:"P1",
//  content:"Hello"
// }

// Followers:

// Kashish
// neha
// Ruhi

// Feed collection:

// {
//  userId: Kashish,
//  postId: P1,
//  score: 100
// }

// {
//  userId: neha,
//  postId: P1,
//  score: 100
// }

// {
//  userId: Ruhi,
//  postId: P1,
//  score: 100
// }

// Later Kashish opens app.

// Instead of:

// Finding all followed users
// Finding all posts
// Sorting

// we simply:

// Feed.find({
//  userId: Kashish
// })

// Very fast.