// Google OAuth with Passport.js
// We don't use sessions: after Google confirms who the user is, we create our
// own JWT cookie, exactly like a normal login.

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');
const config = require('./config');

const googleEnabled = Boolean(config.google.clientID && config.google.clientSecret);

if (googleEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackURL,
      },
      // Called after Google sends the user back with their profile
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const verified = profile.emails?.[0]?.verified !== false;
          if (!email || !verified) {
            return done(null, false, { message: 'Your Google account has no verified email' });
          }

          // 1. Already signed in with Google before?
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            // 2. Signed up with the same email + password before? Link the accounts.
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              await user.save();
            } else {
              // 3. Brand new user
              user = await User.create({
                name: profile.displayName || email.split('@')[0],
                email,
                googleId: profile.id,
              });
            }
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

module.exports = { passport, googleEnabled };
