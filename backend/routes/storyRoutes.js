const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const auth = require('../middleware/auth');

// Get story rings for logged-in user (following users with stories)
router.get('/rings', auth, storyController.getStoryRings);
router.get('/', auth, storyController.getStoryRings); // Alias for /rings

// Get story by owner ID
router.get('/:ownerId', auth, storyController.getStoryByOwner);

// Update user's story image URL
router.put('/user/:userId', auth, storyController.updateUserStory);

module.exports = router;
