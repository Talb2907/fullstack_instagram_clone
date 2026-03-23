const Post = require('../models/Post');
const mongoose = require('mongoose');
const NotificationService = require('../services/notificationService');

// Like a post (toggle like)
exports.toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const hasLiked = post.likes.some(likeId => likeId.toString() === userId);
        if (hasLiked) {
            post.likes = post.likes.filter(likeId => likeId.toString() !== userId);
            // Remove like notification
            await NotificationService.removeLikeNotification(post.author, userId, post._id);
        } else {
            post.likes.push(new mongoose.Types.ObjectId(userId));
            // Create like notification
            await NotificationService.createLikeNotification(post.author, userId, post._id);
        }

        await post.save();

        return res.status(200).json({
            success: true,
            data: {
                postId: post._id,
                liked: !hasLiked,
                likeCount: post.likes.length
            }
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        return res.status(500).json({ success: false, error: 'Failed to toggle like' });
    }
};

// Add a comment to a post
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const comment = {
            content: content.trim(),
            author: new mongoose.Types.ObjectId(userId),
            createdAt: new Date()
        };
        post.comments.push(comment);
        await post.save();

        // Create comment notification
        await NotificationService.createCommentNotification(post.author, userId, post._id, content.trim());

        // Populate just-added comment's author username for client display
        const populated = await Post.findById(id)
            .populate('comments.author', 'username avatarUrl')
            .select('comments likes');

        const newComment = populated.comments[populated.comments.length - 1];

        return res.status(201).json({
            success: true,
            data: {
                postId: post._id,
                comment: newComment,
                commentCount: populated.comments.length
            }
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        return res.status(500).json({ success: false, error: 'Failed to add comment' });
    }
};

// Delete a comment from a post
exports.deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const userId = req.user.id;

        console.log('DELETE COMMENT REQUEST:', { 
            postId: id, 
            commentId, 
            userId,
            commentIdType: typeof commentId,
            commentIdLength: commentId?.length
        });

        // Accept any comment ID format - just ensure it exists
        if (!commentId) {
            console.log('No comment ID provided');
            return res.status(400).json({ 
                success: false, 
                error: 'Comment ID is required' 
            });
        }

        const post = await Post.findById(id);
        if (!post) {
            console.log('Post not found:', id);
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        console.log('Post found, comments count:', post.comments.length);
        console.log('Looking for comment ID:', commentId);
        console.log('Available comment IDs:', post.comments.map(c => c._id.toString()));

        // Find the comment - try multiple methods
        let comment = null;
        
        // First try MongoDB's id() method
        comment = post.comments.id(commentId);
        
        // If not found, try finding by string comparison
        if (!comment) {
            comment = post.comments.find(c => 
                String(c._id) === String(commentId) || 
                String(c.id) === String(commentId)
            );
        }
        
        if (!comment) {
            console.log('Comment not found in post:', commentId);
            console.log('Available comment IDs:', post.comments.map(c => ({ 
                _id: c._id, 
                id: c.id, 
                _idString: String(c._id), 
                idString: String(c.id) 
            })));
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }

        // Check if user is the comment author or post author (both can delete)
        if (comment.author.toString() !== userId && post.author.toString() !== userId) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this comment' });
        }

        // Remove the comment
        console.log('Removing comment from post:', commentId);
        post.comments.pull(commentId);
        
        console.log('Saving updated post to database...');
        await post.save();
        
        // Verify the save worked by re-fetching the post
        const updatedPost = await Post.findById(id);
        console.log('Comment deleted successfully:', {
            commentId,
            remainingComments: post.comments.length,
            updatedPostComments: updatedPost.comments.length,
            postId: post._id
        });

        return res.status(200).json({
            success: true,
            data: {
                postId: post._id,
                commentId: commentId,
                commentCount: post.comments.length
            }
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
};

// CREATE a new post
exports.createPost = async (req, res) => {
    try {
        console.log('111');
        console.log('createPost called with:', { body: req.body, file: req.file });
        
        const { content } = req.body;
        const author = req.user.id; // Get author from authenticated user
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        // Handle uploaded file if present
        let mediaUrl = null;
        let mediaType = 'text';
        
        if (req.file) {
            console.log('File uploaded:', req.file);
            
            // Store relative URL for the uploaded file
            // The filename now includes the extension from our multer config
            mediaUrl = `/uploads/${req.file.filename}`;
            
            // Determine media type based on file extension
            const fileExt = req.file.filename.toLowerCase();
            if (fileExt.match(/\.(mp4|avi|mov|webm)$/)) {
                mediaType = 'video';
            } else if (fileExt.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                mediaType = 'image';
            }
            
            console.log('Media URL constructed:', mediaUrl);
            console.log('Media type determined:', mediaType);
        }
        
        // Extract hashtags from content
        let extractedHashtags = [];
        if (content) {
            const hashtagRegex = /#(\w+)/g;
            const matches = content.match(hashtagRegex);
            if (matches) {
                extractedHashtags = matches.map(tag => tag.substring(1));
            }
        }
        
        const post = new Post({ 
            title: content.substring(0, 100), // Use content as title
            content, 
            author, 
            mediaUrl,
            mediaType,
            hashtags: extractedHashtags,
            likes: [],
            comments: [],
            shares: [],
            isPublished: true
        });
        
        console.log('Post being created:', {
            title: post.title,
            content: post.content,
            author: post.author,
            authorType: typeof post.author,
            mediaUrl: post.mediaUrl,
            mediaType: post.mediaType,
            userId: req.user.id,
            userIdType: typeof req.user.id
        });
        
        await post.save();
        
        // Populate author info before sending response
        await post.populate('author', 'username avatarUrl');
        
        console.log('Post created successfully:', post);
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error.message);
        res.status(400).json({ error: error.message });
    }
};

// UPDATE a post by ID
exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Remove author field from update data to prevent changing ownership
        delete updateData.author;
        
        // Only allow updating specific fields
        const allowedFields = ['title', 'content', 'imageUrl', 'isPublished'];
        const filteredUpdateData = {};
        
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdateData[key] = updateData[key];
            }
        });
        
        // Use owner-scoped query: only update if author matches current user
        const updatedPost = await Post.findOneAndUpdate(
            { _id: id, author: req.user.id }, 
            filteredUpdateData, 
            { new: true, runValidators: true }
        );
        
        if (!updatedPost) {
            return res.status(403).json({ 
                message: 'Not your post',
                error: 'You can only edit your own posts'
            });
        }
        
        // Populate author info before sending response
        await updatedPost.populate('author', 'username avatarUrl');
        
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// DELETE a post by ID
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('DELETE POST REQUEST:', { 
            postId: id, 
            userId: req.user.id,
            userType: typeof req.user.id
        });
        
        // First, find the post to get Facebook post ID
        const post = await Post.findOne({ _id: id, author: req.user.id });
        
        console.log('Post found:', post ? 'YES' : 'NO');
        if (post) {
            console.log('Post details:', {
                postId: post._id,
                author: post.author,
                authorType: typeof post.author,
                facebookPostId: post.facebookPostId
            });
        }
        
        if (!post) {
            // Let's also check if the post exists at all
            const anyPost = await Post.findById(id);
            console.log('Post exists in DB:', anyPost ? 'YES' : 'NO');
            if (anyPost) {
                console.log('Post author:', anyPost.author, 'Current user:', req.user.id);
                console.log('Authors match:', String(anyPost.author) === String(req.user.id));
                
                // Try to fix the ownership issue by updating the post
                if (String(anyPost.author) !== String(req.user.id)) {
                    console.log('Attempting to fix ownership...');
                    anyPost.author = req.user.id;
                    await anyPost.save();
                    console.log('Ownership fixed, using this post');
                    post = anyPost;
                }
            }
            
            if (!post) {
                return res.status(403).json({ 
                    message: 'Not your post',
                    error: 'You can only delete your own posts'
                });
            }
        }
        
        // Delete from Facebook if it was shared there
        if (post.facebookPostId) {
            try {
                const axios = require('axios');
                const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
                
                if (pageAccessToken) {
                    await axios.delete(
                        `https://graph.facebook.com/v18.0/${post.facebookPostId}`,
                        {
                            params: {
                                access_token: pageAccessToken
                            }
                        }
                    );
                    console.log('Post deleted from Facebook successfully:', post.facebookPostId);
                }
            } catch (facebookError) {
                console.error('Failed to delete from Facebook:', facebookError.response?.data || facebookError.message);
                // Continue with local deletion even if Facebook deletion fails
            }
        }
        
        // Delete from local database
        await Post.deleteOne({ _id: id, author: req.user.id });
        
        res.status(200).json({ message: 'Post deleted!' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// DEBUG: Delete post with detailed logging
exports.debugDeletePost = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('DEBUG DELETE POST:', { 
            postId: id, 
            userId: req.user.id,
            userType: typeof req.user.id,
            userObject: req.user
        });
        
        // Find post without author restriction first
        const anyPost = await Post.findById(id);
        console.log('Any post found:', anyPost ? 'YES' : 'NO');
        
        if (anyPost) {
            console.log('Post details:', {
                _id: anyPost._id,
                author: anyPost.author,
                authorType: typeof anyPost.author,
                authorString: String(anyPost.author),
                userIdString: String(req.user.id),
                facebookPostId: anyPost.facebookPostId
            });
        }
        
        // Try to delete with author restriction
        const result = await Post.deleteOne({ _id: id, author: req.user.id });
        console.log('Delete result:', result);
        
        if (result.deletedCount === 0) {
            // Try to delete without author restriction (for debugging)
            console.log('Trying to delete without author restriction...');
            const debugResult = await Post.deleteOne({ _id: id });
            console.log('Debug delete result:', debugResult);
            
            if (debugResult.deletedCount > 0) {
                return res.status(200).json({ 
                    message: 'Post deleted (debug mode)', 
                    debug: true,
                    deletedCount: debugResult.deletedCount
                });
            }
            
            return res.status(404).json({ 
                message: 'Post not found or not yours',
                debug: true,
                postExists: !!anyPost,
                authorMatch: anyPost ? String(anyPost.author) === String(req.user.id) : false
            });
        }
        
        res.status(200).json({ 
            message: 'Post deleted successfully!',
            deletedCount: result.deletedCount
        });
        
    } catch (error) {
        console.error('Debug delete error:', error);
        res.status(500).json({ 
            error: error.message,
            debug: true
        });
    }
};

// REPORT a post by ID
exports.reportPost = async (req, res) => {
    try {
        const { id } = req.params;
        const reporterId = req.user.id;
        
        // Check if post exists
        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ 
                success: false,
                error: 'Post not found' 
            });
        }
        
        // Check if user is reporting their own post
        if (post.author.toString() === reporterId) {
            return res.status(400).json({ 
                success: false,
                error: 'Cannot report your own post' 
            });
        }
        
        // Log the report (you can extend this to save to a reports collection)
        console.log(`Post ${id} reported by user ${reporterId}`);
        
        // For now, just return success
        // In the future, you could:
        // 1. Save report to a Reports collection
        // 2. Track report count per post
        // 3. Implement moderation actions
        
        res.status(200).json({ 
            success: true,
            message: 'Post reported successfully' 
        });
        
    } catch (error) {
        console.error('Error reporting post:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to report post' 
        });
    }
};

// LIST posts for authenticated user (following + own posts)
exports.listPosts = async (req, res) => {
    try {
        console.log('=== USER FEED: LIST POSTS ===');
        console.log('Route:', req.originalUrl);
        console.log('User ID:', req.user.id);
        
        const meId = req.user.id;
        
        // Get current user's following list
        const User = require('../models/User');
        const currentUser = await User.findById(meId).select('following');
        if (!currentUser) {
            console.log('Current user not found in database');
            return res.status(404).json({ error: 'Current user not found' });
        }
        
        console.log('Current user following count:', currentUser.following?.length || 0);
        
        // Build authors array: [meId, ...followingIds]
        const followingIds = currentUser.following || [];
        const authors = [meId, ...followingIds];
        
        // Convert all IDs to ObjectId
        const authorObjectIds = authors.map(id => new mongoose.Types.ObjectId(id));
        
        console.log('Authors to include:', authors);
        console.log('Author ObjectIds:', authorObjectIds);
        
        // Query posts from authors (including self)
        const posts = await Post.find({ 
            author: { $in: authorObjectIds },
            isPublished: true 
        })
        .populate('author', 'username avatarUrl')
        .populate('comments.author', 'username avatarUrl')
        .sort({ createdAt: -1 });
        
        console.log('Posts found:', posts.length);
        console.log('Sample posts:', posts.slice(0, 3).map(p => ({
            id: p._id,
            title: p.title?.substring(0, 30) + '...',
            author: p.author?.username,
            isPublished: p.isPublished,
            likes: p.likes?.length || 0,
            shares: p.shares?.length || 0
        })));
        
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error listing posts:', error);
        res.status(400).json({ error: error.message });
    }
};

// SEARCH posts by specific date (YYYY-MM-DD)
exports.searchPostsByDate = async (req, res) => {
    try {
        const { date } = req.query; // expects 'YYYY-MM-DD'
        if (!date) return res.status(400).json({ error: 'Date query required' });
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        const posts = await Post.find({
            createdAt: { $gte: start, $lt: end }
        }).populate('author', 'username avatarUrl');
        res.status(200).json(posts);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get post by ID with author population
exports.getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id)
            .populate('author', 'username avatarUrl')
            .populate('likes', 'username')
            .populate('comments.author', 'username avatarUrl');
        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found',
                code: 'POST_NOT_FOUND'
            });
        }
        res.status(200).json({
            success: true,
            data: post
        });
    } catch (error) {
        console.error('Error fetching post:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch post',
            code: 'FETCH_POST_ERROR'
        });
    }
};

// Get posts by author
exports.getPostsByAuthor = async (req, res) => {
    try {
        const { authorId } = req.params;
        console.log('=== GET POSTS BY AUTHOR ===');
        console.log('Author ID from params:', authorId);
        console.log('Author ID type:', typeof authorId);
        console.log('User from auth middleware:', req.user);
        
        console.log('Querying posts with author:', authorId);
        console.log('Query filter:', { author: authorId, isPublished: true });
        
        // Try to find posts with the author ID (handle both string and ObjectId formats)
        let posts = await Post.find({ author: authorId, isPublished: true })
            .populate('author', 'username avatarUrl')
            .sort({ createdAt: -1 });
            
        // If no posts found, try with ObjectId conversion
        if (posts.length === 0) {
            try {
                const mongoose = require('mongoose');
                const objectId = new mongoose.Types.ObjectId(authorId);
                posts = await Post.find({ author: objectId, isPublished: true })
                    .populate('author', 'username avatarUrl')
                    .sort({ createdAt: -1 });
                console.log('Tried with ObjectId conversion, found:', posts.length, 'posts');
            } catch (objIdError) {
                console.log('ObjectId conversion failed:', objIdError.message);
            }
        }
            
        console.log('Found posts:', posts.length);
        console.log('Posts:', posts);
        
        // Also check if there are any posts at all in the database
        const totalPosts = await Post.countDocuments({});
        console.log('Total posts in database:', totalPosts);
        
        // Check posts with any author
        const samplePosts = await Post.find({}).limit(3).select('author title');
        console.log('Sample posts from database:', samplePosts);
        
        // Check if the authorId exists in any posts
        const postsWithAuthor = await Post.find({ author: authorId }).select('author title content');
        console.log('Posts with this author ID:', postsWithAuthor);
        
        // Check all unique author IDs in the database
        const allAuthors = await Post.distinct('author');
        console.log('All author IDs in database:', allAuthors);
        console.log('Author ID we are looking for:', authorId);
        console.log('Is authorId in allAuthors?', allAuthors.includes(authorId));
        
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error fetching posts by author:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts by author',
            code: 'FETCH_POSTS_AUTHOR_ERROR'
        });
    }
};

// Search posts by title
exports.getPostsByTitle = async (req, res) => {
    try {
        const { title, page = 1, limit = 10 } = req.query;
        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title query parameter is required',
                code: 'MISSING_TITLE'
            });
        }
        const skip = (page - 1) * limit;
        const posts = await Post.find({
            title: { $regex: title, $options: 'i' },
            isPublished: true
        })
        .populate('author', 'username avatarUrl')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error searching posts by title:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search posts by title',
            code: 'SEARCH_POSTS_TITLE_ERROR'
        });
    }
};

// Search posts by content
exports.getPostsByContent = async (req, res) => {
    try {
        const { content, page = 1, limit = 10 } = req.query;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content query parameter is required',
                code: 'MISSING_CONTENT'
            });
        }
        const skip = (page - 1) * limit;
        const posts = await Post.find({
            content: { $regex: content, $options: 'i' },
            isPublished: true
        })
        .populate('author', 'username avatarUrl')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error searching posts by title:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search posts by title',
            code: 'SEARCH_POSTS_TITLE_ERROR'
        });
    }
};

// Get posts by date range
exports.getPostsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required',
                code: 'MISSING_DATES'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD',
                code: 'INVALID_DATE_FORMAT'
            });
        }
        const skip = (page - 1) * limit;
        const posts = await Post.find({
            createdAt: { $gte: start, $lte: end },
            isPublished: true
        })
        .populate('author', 'username avatarUrl')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error searching posts by title:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search posts by title',
            code: 'SEARCH_POSTS_TITLE_ERROR'
        });
    }
};

// Search posts by content
exports.getPostsByContent = async (req, res) => {
    try {
        const { content, page = 1, limit = 10 } = req.query;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content query parameter is required',
                code: 'MISSING_CONTENT'
            });
        }
        const skip = (page - 1) * limit;
        const posts = await Post.find({
            content: { $regex: content, $options: 'i' },
            isPublished: true
        })
        .populate('author', 'username avatarUrl')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error searching posts by title:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search posts by title',
            code: 'SEARCH_POSTS_TITLE_ERROR'
        });
    }
};

// Get posts by date range
exports.getPostsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required',
                code: 'MISSING_DATES'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD',
                code: 'INVALID_DATE_FORMAT'
            });
        }
        const skip = (page - 1) * limit;
        const posts = await Post.find({
            createdAt: { $gte: start, $lte: end },
            isPublished: true
        })
        .populate('author', 'username avatarUrl')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error fetching posts by date range:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts by date range',
            code: 'DATE_RANGE_ERROR'
        });
    }
};

// Personalized feed for authenticated user
exports.getPersonalizedFeed = async (req, res) => {
    
    try {
        console.log('=== PERSONALIZED FEED ENDPOINT HIT ===');
        console.log('Route:', req.originalUrl);
        console.log('Method:', req.method);
        console.log('Current user ID:', req.user.id);
        console.log('User object:', req.user);
        
        const currentUserId = req.user.id;
        
        // Find current user to get following list
        const User = require('../models/User');
        const currentUser = await User.findById(currentUserId).select('following');
        if (!currentUser) {
            console.log('Current user not found in database');
            return res.status(404).json({ success: false, error: 'Current user not found' });
        }
        
        console.log('Current user following count:', currentUser.following?.length || 0);
        
        // If no following, return empty array
        if (!currentUser.following || currentUser.following.length === 0) {
            console.log('User has no following - returning empty feed');
            return res.status(200).json({ 
                success: true, 
                data: [],
                debug: {
                    reason: 'NO_FOLLOWING',
                    currentUserId,
                    followingCount: 0,
                    endpoint: req.originalUrl
                }
            });
        }
        
        // Normalize/cast following IDs to ObjectId explicitly
        const followingIds = currentUser.following.map(id => new mongoose.Types.ObjectId(id));
        console.log('Following IDs (normalized):', followingIds);
        
        // Build MongoDB query
        const mongoQuery = { 
            author: { $in: followingIds }, 
            isPublished: true 
        };
        console.log('MongoDB query:', JSON.stringify(mongoQuery, null, 2));
        
        // Execute query
        const posts = await Post.find(mongoQuery)
            .populate('author', 'username avatarUrl')
            .populate('comments.author', 'username')
            .sort({ createdAt: -1 });
        
        console.log('Posts found:', posts.length);
        console.log('Post details:', posts.map(p => ({
            id: p._id,
            title: p.title?.substring(0, 30) + '...',
            author: p.author?.username,
            createdAt: p.createdAt
        })));
        
        console.log('=== PERSONALIZED FEED COMPLETE ===');
        
        return res.status(200).json({ 
            success: true, 
            data: posts,
            debug: { 
                currentUserId, 
                followingCount: followingIds.length, 
                returned: posts.length,
                endpoint: req.originalUrl
            } 
        });
        
    } catch (error) {
        console.error('Error in personalized feed:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch personalized feed',
            debug: { endpoint: req.originalUrl }
        });
    }
};

// Share a post
exports.sharePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const { targetUserId } = req.body; // The user we're sharing with

        console.log('Share post request:', { postId, userId, targetUserId });

        // Always increment shareCount (counts total share actions),
        // and keep a unique set of sharers in `shares`.
        const updatedPost = await Post.findOneAndUpdate(
            { _id: postId },
            { $addToSet: { shares: new mongoose.Types.ObjectId(userId) }, $inc: { shareCount: 1 } },
            { new: true }
        );

        if (!updatedPost) {
            return res.status(404).json({ message: 'Post not found' });
        }

        console.log(`Post ${postId} shared by user ${userId}. Unique sharers: ${updatedPost.shares.length}, shareCount: ${updatedPost.shareCount}`);

        res.status(200).json({
            success: true,
            message: 'Post shared successfully',
            shareCount: updatedPost.shareCount ?? updatedPost.shares.length,
            data: {
                postId: updatedPost._id,
                shareCount: updatedPost.shareCount ?? updatedPost.shares.length,
                sharedBy: userId,
                sharedWith: targetUserId
            }
        });
    } catch (error) {
        console.error('Error sharing post:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get dashboard data for current user
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Getting dashboard data for user:', userId);

        // Get all posts by the current user with likes, comments, and shares count
        const posts = await Post.find({ 
            author: userId,
            isPublished: true 
        })
        .select('_id title content mediaUrl mediaType likes comments shares shareCount createdAt')
        .sort({ createdAt: -1 }) // Most recent first
        .limit(20); // Limit to last 20 posts for performance

        // Transform data for dashboard
        const dashboardData = posts.map(post => ({
            id: post._id,
            title: post.title,
            content: post.content,
            mediaUrl: post.mediaUrl,
            mediaType: post.mediaType,
            createdAt: post.createdAt,
            likeCount: post.likes ? post.likes.length : 0,
            commentCount: post.comments ? post.comments.length : 0,
            shareCount: post.shares ? post.shares.length : (post.shareCount || 0),
            // Create thumbnail URL (same as media URL for simplicity)
            thumbnailUrl: post.mediaUrl || '/images/post.png'
        }));

        console.log(`Found ${dashboardData.length} posts for dashboard`);

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch dashboard data',
            message: error.message
        });
    }
};