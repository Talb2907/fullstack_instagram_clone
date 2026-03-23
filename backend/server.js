require('dotenv').config({ path: './.env' });
const express = require('express');
const path = require('path');


// Set default JWT_SECRET if not loaded from .env
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'default_jwt_secret_for_development_2024';
  console.log('JWT_SECRET not found in .env, using default value');
}

console.log('Environment variables loaded:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PAGE_ID:', process.env.PAGE_ID ? 'SET' : 'NOT SET');
console.log('PAGE_ACCESS_TOKEN:', process.env.PAGE_ACCESS_TOKEN ? 'SET' : 'NOT SET');

const connectDB = require('./config/db');
const userRouter = require('./routes/userRoutes');
const postRouter = require('./routes/postRoutes');
const groupRouter = require('./routes/groupRoutes');
const feedRouter = require('./routes/feedRoutes');
const storyRouter = require('./routes/storyRoutes');
const factRouter = require('./routes/factRoutes');
const followingRouter = require('./routes/followingRoutes');
const notificationRouter = require('./routes/notificationRoutes');
const facebookRouter = require('./routes/facebookRoutes');

// auth and userController are now only used in routes

const app = express();

// Import shared upload configuration
const { UPLOADS_DIR } = require('./config/upload');

app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded files FIRST (before API routes to avoid conflicts)
app.use('/uploads', express.static(UPLOADS_DIR, { 
  index: false, 
  fallthrough: false,
  setHeaders: (res, path) => {
    // Set CORS headers for uploaded files to ensure Facebook can access them
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
  }
}));

// API routes (must come AFTER uploads route to avoid conflicts)
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);
app.use('/api/groups', groupRouter);
app.use('/api/feed', feedRouter);
app.use('/api/stories', storyRouter);
app.use('/api/fact', factRouter);
app.use('/api/following', followingRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/facebook', facebookRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});



// Static file routes (must come AFTER API routes)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/feed', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/feed.html'));
});

// Note: /api/me and /api/stories are now handled by userRoutes.js
// These routes are accessible via /api/users/me and /api/users/stories

console.log("connecting to the db...");
connectDB();
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
