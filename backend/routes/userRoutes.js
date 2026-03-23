const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

console.log('userRoutes loaded (me-before-id)'); // for DEBUG


router.get('/me', auth, (req, res) => {
  console.log('HIT /me, req.user.id =', req.user && req.user.id); // DEBUG
  return userController.getCurrentUser(req, res);
});
router.get('/me/debug', auth, userController.debugCurrentUser);
router.get('/me/following', auth, userController.getUserFollowing);
router.get('/me/stats', auth, userController.getCurrentUserStats);
router.get('/stories', auth, userController.getStories);
router.get('/suggestions', auth, userController.getSuggestions);

// Search / list routes 
router.get('/', userController.getAllUsers);
router.get('/search', auth, userController.getAllUsersForSearch); // New route for search with auth
router.get('/search/username', userController.getUsersByUsername);
router.get('/search/email', userController.getUsersByEmail);
router.get('/by-username/:username', userController.getUserByUsername);

// User registration and login 
router.post('/register', userController.register);
router.post('/login', userController.login);

// Profile management
router.put('/profile', auth, require('../config/upload').uploadImage.single('avatar'), userController.updateUserProfile);
router.put('/me/update', auth, require('../config/upload').uploadImage.single('avatar'), userController.updateCurrentUserProfile);
router.put('/me/avatar', auth, userController.updateUserAvatar);
router.delete('/me', auth, userController.deleteMyAccount);


// Specific parameter routes first
router.get('/:id/friends', validateObjectId, userController.getUserFriends);
router.get('/:id/groups', validateObjectId, userController.getUserGroups);
router.post('/:id/follow', auth, validateObjectId, userController.followUser);
router.post('/:id/unfollow', auth, validateObjectId, userController.unfollowUser);
router.delete('/:id', validateObjectId, userController.deleteUser);

// User profile with posts data
router.get('/:id/profile', auth, validateObjectId, userController.getUserProfileWithPosts);

// Generic parameter route LAST (to avoid conflicts)
router.get('/:id', validateObjectId, (req, res) => {
  console.log('HIT /:id, param id =', req.params.id); // DEBUG
  return userController.getUserById(req, res);
});

module.exports = router;
