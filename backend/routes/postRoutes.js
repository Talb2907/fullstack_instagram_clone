const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

// Add basic request logging for debugging
router.use((req, res, next) => {
    console.log(`[POST ROUTES] ${req.method} ${req.path} - Params:`, req.params);
    console.log(`[POST ROUTES] Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    next();
});



// Import shared upload configuration
const { uploadMedia } = require('../config/upload');

// Create a new post (requires authentication and handles file uploads)
router.post('/', auth, uploadMedia.single('image'), postController.createPost);

// List all posts - NOW PROTECTED (requires authentication)
router.get('/', auth, postController.listPosts);

// Search routes (must come before /:id route to avoid conflicts)
router.get('/search/by-date', postController.searchPostsByDate);
router.get('/search/by-title', postController.getPostsByTitle);
router.get('/search/by-content', postController.getPostsByContent);
router.get('/search/by-author/:authorId', auth, validateObjectId, (req, res, next) => {
    console.log('=== ROUTE: GET POSTS BY AUTHOR ===');
    console.log('Route hit with authorId:', req.params.authorId);
    console.log('User from auth:', req.user);
    next();
}, postController.getPostsByAuthor);
router.get('/search/by-date-range', postController.getPostsByDateRange);

// Personalized feed for authenticated user
//router.get('/feed', auth, postController.getPersonalizedFeed);

// Dashboard data for authenticated user
router.get('/dashboard', auth, postController.getDashboardData);

// Parameter routes LAST (to avoid conflicts with search routes)
router.put('/:id', auth, validateObjectId, postController.updatePost);
router.delete('/:id', auth, validateObjectId, postController.deletePost);
router.delete('/:id/debug', auth, validateObjectId, postController.debugDeletePost);
router.post('/:id/report', auth, validateObjectId, postController.reportPost);
router.get('/:id', validateObjectId, postController.getPostById);

// Likes, comments and shares
router.post('/:id/like', auth, validateObjectId, postController.toggleLike);
router.post('/:id/comments', auth, validateObjectId, postController.addComment);
router.delete('/:id/comments/:commentId', auth, validateObjectId, (req, res, next) => {
  console.log('DELETE COMMENT ROUTE HIT:', {
    postId: req.params.id,
    commentId: req.params.commentId,
    method: req.method,
    path: req.path
  });
  next();
}, postController.deleteComment);

// Test endpoint to check comment deletion
router.get('/:id/comments/:commentId/test', auth, validateObjectId, async (req, res) => {
  try {
    const { id, commentId } = req.params;
    console.log('TESTING COMMENT DELETION:', { postId: id, commentId });
    
    const Post = require('../models/Post');
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    console.log('Post found, comments count:', post.comments.length);
    console.log('Looking for comment ID:', commentId);
    console.log('Available comment IDs:', post.comments.map(c => c._id.toString()));
    
    // Try to find the comment
    let comment = post.comments.id(commentId);
    if (!comment) {
      comment = post.comments.find(c => 
        String(c._id) === String(commentId) || 
        String(c.id) === String(commentId)
      );
    }
    
    if (comment) {
      res.json({
        success: true,
        commentFound: true,
        comment: {
          id: comment._id,
          content: comment.content,
          author: comment.author
        }
      });
    } else {
      res.json({
        success: true,
        commentFound: false,
        availableComments: post.comments.length
      });
    }
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});
router.post('/:id/share', auth, validateObjectId, postController.sharePost);



module.exports = router; 