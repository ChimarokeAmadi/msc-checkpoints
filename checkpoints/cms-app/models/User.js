// models/User.js
// Someone who can log in to the CMS. There are three roles:
//   author  - writes posts and sends them for review (can't publish)
//   editor  - edits and publishes anyone's posts, manages categories and comments
//   admin   - everything an editor can do, plus managing users

const mongoose = require('mongoose');

const ROLES = ['author', 'editor', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'author' },
    // An admin can switch an account off without deleting its posts
    active: { type: Boolean, default: true },
    bio: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash; // never send the password hash
    delete ret.__v;
    return ret;
  },
});

// Editors and admins can do the "editor" things
userSchema.methods.canEdit = function () {
  return this.role === 'editor' || this.role === 'admin';
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
