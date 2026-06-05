// A post document in MongoDB.

const mongoose = require('mongoose');

// Imagine: if we use username in post instead of authorId, then when username changes, we need to update all posts by that user. Not good.
// Bad design.

//Instead:
//Store reference to User.
const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      //This ObjectId belongs to User collection
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {

    //     Automatically adds:

    // createdAt
    // updatedAt
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

//why index used -> for faster queries. Index on authorId -> get all posts by a user. Index on createdAt -> get latest posts. Compound index on likesCount and createdAt -> get trending posts.
//This is a compound index.Not one field.Multiple fields.
// Newest post first for a user -> sort by createdAt desc, then _id desc (to break ties).
postSchema.index({ authorId: 1, createdAt: -1, _id: -1 });

// For trending posts:Most liked posts in last 48 hours -> sort by likesCount desc, then createdAt desc(to break ties).
postSchema.index({ likesCount: -1, createdAt: -1 });

//Latest Posts -> sort by createdAt desc, then _id desc (to break ties).
postSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('Post', postSchema);
