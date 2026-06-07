const mongoose = require('mongoose');

//Kashish follows Rahul

// Database stores:

// {
//    followerId: Kashish_Id,
//    followingId: Ruhi_Id
// }
const followSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

//One user should follow another user only once.No duplicate follow relationships.
//Why Compound Index?
// Because uniqueness should apply to:
// (Kashish, Ruhi)
// pair.

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
//Who follows me? -> used in push feed. who do I follow? -> used in pull feed.
// Why not two separate indexes?
// Because we always query by both followerId and followingId together. We don't have a use case where we query by just one of them. So a compound index on both fields is more efficient for our queries than having two separate indexes on each field.

// Who follows me? 
// Follow.find({
//    followingId:userId
// })

// Who do I follow?
// Follow.find({
//    followerId:userId
// })
followSchema.index({ followingId: 1, followerId: 1 });

module.exports = mongoose.model('Follow', followSchema);
