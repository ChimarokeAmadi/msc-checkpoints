// models/User.js
// The shape of a user in the database. Mongoose checks every user against
// this schema before saving it, so bad data never reaches MongoDB.

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true, // "  Ada  " is saved as "Ada"
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true, // MongoDB creates a unique index, so two users can't share an email
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'email is not valid'],
    },
    age: {
      type: Number,
      min: [0, 'age cannot be negative'],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  },
);

// Export the model. mongoose.model('User', ...) uses the "users" collection.
module.exports = mongoose.model('User', userSchema);
