const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const validateObjectId = require('../middleware/validateObjectId');
const auth = require('../middleware/auth');

// Import shared upload configuration
const { uploadImage } = require('../config/upload');

// Create group
router.post('/', auth, uploadImage.single('groupAvatar'), groupController.createGroup);

// Get all groups
router.get('/', auth, groupController.getGroups);

// Get my groups
router.get('/my', auth, groupController.getMyGroups);

// Check if user is admin of group
router.get('/:groupId/admin-check', auth, groupController.isGroupAdmin);

// Add member to group (admin only)
router.post('/:groupId/members/:memberId', auth, groupController.addMember);

// Remove member from group (admin only)
router.delete('/:groupId/members/:memberId', auth, groupController.removeMember);

              // Join group (any authenticated user)
              router.post('/:id/join', auth, groupController.joinGroup);
              
              // Leave group (any authenticated user)
              router.post('/:id/leave', auth, groupController.leaveGroup);

// Search routes (must come before /:id route to avoid conflicts)
router.get('/search/by-name', auth, groupController.getGroupsByName);
router.get('/search/by-category', auth, groupController.getGroupsByCategory);
router.get('/search/by-date-range', auth, groupController.getGroupsByDateRange);
router.get('/search/filtered', auth, groupController.getGroupsWithFilters);
router.get('/search/advanced', auth, groupController.advancedGroupSearch);

// Parameter routes LAST (to avoid conflicts with search routes)
router.get('/:id', auth, validateObjectId, groupController.getGroupById);
router.put('/:id', auth, validateObjectId, groupController.updateGroup);
router.delete('/:id', auth, validateObjectId, groupController.deleteGroup);

module.exports = router; 