// backend/config/db.js
const mongoose = require('mongoose');
const path = require('path');

// load backend/.env explicitly
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_URL = process.env.MONGODB_URI;
if (!DB_URL) {
  console.error('Missing MONGODB_URI in backend/.env');
  process.exit(1);
}

//mask the password
const mask = (u) => u.replace(/:(.*?)@/, ':***@');

async function connectDB() {
  try {
    console.log('MONGODB_URI (safe):', mask(DB_URL));
    console.log('Connecting to MongoDB Atlas...');

    //connect to the DB
    await mongoose.connect(DB_URL);

    console.log('Mongo connected → host:', mongoose.connection.host, 'db:', mongoose.connection.name);
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err.name, err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
