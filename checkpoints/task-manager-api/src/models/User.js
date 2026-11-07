const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    // Not required: people who sign in with Google don't have one.
    // select: false = never returned by queries unless we ask for it.
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [128, 'Password must be at most 128 characters'],
      select: false,
    },
    googleId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

// Hash the password before saving (never store it in plain text)
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.checkPassword = function checkPassword(candidate) {
  if (!this.password) return Promise.resolve(false); // Google-only account
  return bcrypt.compare(candidate, this.password);
};

// What we send back to the client: no password, no internal fields
userSchema.methods.toPublic = function toPublic() {
  return { id: this._id, name: this.name, email: this.email, googleLinked: Boolean(this.googleId) };
};

module.exports = mongoose.model('User', userSchema);
