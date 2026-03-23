const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const postController = require('../controllers/postController');

// Explicit personalized path to help verify frontend is calling the right endpoint
router.get('/personalized', auth, (req, res) => {
  console.log('HIT /api/feed/personalized by user', req.user && req.user.id); // DEBUG
  return postController.getPersonalizedFeed(req, res);
});

// Personalized feed route - single source of truth (must come AFTER /personalized)
router.get('/', auth, postController.getPersonalizedFeed);

module.exports = router;
