require("dotenv").config();
require("./config/passport");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const nodemailer = require("nodemailer");

const authModel = require("./Models/Model");
const TodoRoutes = require("./Routes/TodoRoutes");
const NoteRoutes = require("./Routes/NoteRoutes");
const TaskRoutes = require("./Routes/TaskRoutes");
const youtubeRoutes = require('./Routes/YouTubeRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  w: "majority"
})
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("Error details:", err);
    process.exit(1);
  });

// Middleware
app.use(cors({
  origin: "http://localhost:3001",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    collectionName: "sessions",
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Hello from Task Manager backend!" });
});

// Register (SignUp)
app.post("/register", async (req, res) => {
  const { userName, email, password } = req.body;
  try {
    const existingUser = await authModel.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new authModel({ userName, email, password: hashedPassword });
    const savedUser = await newUser.save();

    const token = jwt.sign({ userId: savedUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: savedUser._id,
        userName: savedUser.userName,
        email: savedUser.email,
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error creating user", error: err.message });
  }
});

// Local Login
app.post("/login", passport.authenticate("local", { failureRedirect: process.env.FRONTEND_DOMAIN }), (req, res) => {
  res.json({ success: "Logged in successfully", user: req.user });
});

// Logout
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.json({ success: "Logged out successfully" });
  });
});

// Google Auth
app.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/google/callback", passport.authenticate("google", {
  failureRedirect: process.env.FRONTEND_DOMAIN,
  successRedirect: `${process.env.FRONTEND_DOMAIN}/Home`,
}));

// Facebook Auth
app.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
app.get("/facebook/callback", passport.authenticate("facebook", {
  failureRedirect: process.env.FRONTEND_DOMAIN,
  successRedirect: `${process.env.FRONTEND_DOMAIN}/Home`,
}));

// Forgot Password
app.post("/forgotpass", async (req, res) => {
  const { email } = req.body;
  const user = await authModel.findOne({ email });
  if (!user) return res.send({ Status: "Invalid email" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset your Task Manager password",
    html: `<p>Click <a href="${process.env.FRONTEND_DOMAIN}/ResetPass/${user._id}/${token}">here</a> to reset your password.</p>`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) return res.send({ Status: "Failed to send email" });
    res.send({ Status: "success" });
  });
});

// Reset Password
app.post("/resetPassword/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { newPassword } = req.body;

  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err) => {
    if (err) return res.status(400).send({ Status: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await authModel.findByIdAndUpdate(id, { password: hashedPassword });
    res.send({ Status: "Password reset successful" });
  });
});

// Get Current User
app.get("/getUser", (req, res) => {
  if (req.user) return res.json(req.user);
  res.status(401).json({ error: "Not authenticated" });
});

// Auth middleware
const authenticator = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Login Required" });
  next();
};

// Protected Routes
app.use("/todo", authenticator, TodoRoutes);
app.use("/note", authenticator, NoteRoutes);
app.use("/task", authenticator, TaskRoutes);
app.use('/youtube', youtubeRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
