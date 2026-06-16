// mongoose is library -> which help interacting node to mongodb, ODM (Object Document Mapper)
// mongodb is the data base

//What does a User look like?
// Mongoose helps convert:
// {
//   username:"kashish"
// }
// into MongoDB documents.




const mongoose = require('mongoose');

// Schema
//    ↓
// Rules for User Documents

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,// tell mongoose to create a unique index on username
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,// tell mongoose to create a unique index on email
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  //This is schema configuration. It allows us to specify options for how the schema behaves.
  //   ret = {
  //  _id:"123",
  //  __v:0,
  //  username:"kashish"
  // }
  //converted to 
  //{
  //  id:"123",
  //  _id:"123"
  // }
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      //Last cleanup before response is sent to client
      transform(doc, ret) {

        ret.id = ret._id.toString(); 
        delete ret._id; // _id is a MongoDB specific field, we can remove it from the response and use id instead for better readability and consistency with common API design practices.
        delete ret.__v; // __v is a version key added by Mongoose for internal use, we can remove it from the response as it's not relevant to the client.
        delete ret.password; // We should never send the password hash to the client for security reasons, so we remove it from the response.
        return ret;
      },
    },
  },
);

//Create fast lookup on username
// Without index:
// 1 million users
//  ↓
// Check every user, Slow.
//With index:Jump directly,Fast.

// 1  → Ascending
// -1 → Descending

userSchema.index({ followersCount: -1 });

module.exports = mongoose.model('User', userSchema);

// Schema

// Structure and validation rules.

// Model

// Object used to perform CRUD operations.

// Zod
//    ↓
// Request Validation, Protects the API

// Mongoose
//    ↓
// Database Validation, Protects the Database
