const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const authModel = require("../Models/Model");

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/google/callback",
  }, async (accessToken, refreshToken, profile, cb) => {
    try {
      const existingUser = await authModel.findOne({ googleId: profile.id });
      if (existingUser) return cb(null, existingUser);

      const newUser = new authModel({
        userName: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        picUrl: profile.photos[0].value,
      });
      const savedUser = await newUser.save();
      return cb(null, savedUser);
    } catch (err) {
      return cb(err);
    }
  }));
} else {
  console.warn("⚠️ Missing Google OAuth credentials in .env");
}

// Facebook Strategy
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/facebook/callback",
    profileFields: ["id", "email", "displayName", "photos"],
  }, async (accessToken, refreshToken, profile, cb) => {
    try {
      const existingUser = await authModel.findOne({ fbId: profile.id });
      if (existingUser) return cb(null, existingUser);

      const newUser = new authModel({
        userName: profile.displayName,
        fbId: profile.id,
        email: profile.emails?.[0]?.value || "",
        picUrl: profile.photos?.[0]?.value || "",
      });
      const savedUser = await newUser.save();
      return cb(null, savedUser);
    } catch (err) {
      return cb(err);
    }
  }));
} else {
  console.warn("⚠️ Missing Facebook OAuth credentials in .env");
}

// Local Strategy
passport.use(new LocalStrategy({
  usernameField: "email",
}, async (email, password, done) => {
  try {
    const user = await authModel.findOne({ email });
    if (!user) return done(null, false, { message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return done(null, false, { message: "Incorrect password" });

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Serialize/Deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  authModel.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err));
});
