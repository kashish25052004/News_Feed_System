
//Connect Node.js application to MongoDB

// MongoDB = Database
// Mongoose = ODM (Object Document Mapper)

// Without Mongoose:

// db.users.insertOne(...)

// With Mongoose:

// User.create(...)

// Much easier.

const mongoose = require('mongoose');

 
async function connectDb() {
  const mongoUri = process.env.MONGO_URI;
  //fail fast principle -> Fail immediately with clear error
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  mongoose.set('strictQuery', true);// 
  await mongoose.connect(mongoUri); // yaha per error aata better hai ki hum phele hi error immediately dede 
  console.log('MongoDB connected');
}

module.exports = connectDb;
