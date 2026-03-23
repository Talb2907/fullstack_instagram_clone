const Story = require('../models/Story');
const User = require('../models/User');
const mongoose = require('mongoose');

// Get story rings for logged-in user (following users with stories)
exports.getStoryRings = async (req, res) => {
    try {
        console.log('=== GET STORY RINGS ===');
        console.log('User ID:', req.user.id);
        console.log('User object keys:', Object.keys(req.user));
        console.log('DB Connection:', {
            name: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port
        });
        
        const meId = req.user.id;
        console.log('Me ID:', meId);
        console.log('Me ID type:', typeof meId);
        console.log('Me ID valid ObjectId:', mongoose.Types.ObjectId.isValid(meId));
        
        // Get current user's following list
        const currentUser = await User.findById(meId).select('following');
        if (!currentUser) {
            console.log('Current user not found in database');
            return res.status(404).json({ 
                success: false, 
                error: 'Current user not found' 
            });
        }
        
        console.log('Current user following count:', currentUser.following?.length || 0);
        console.log('Current user following IDs:', currentUser.following || []);
        console.log('Current user following type:', typeof currentUser.following);
        console.log('Current user following is array:', Array.isArray(currentUser.following));
        
        // Check if following IDs are ObjectIds or strings
        if (currentUser.following && currentUser.following.length > 0) {
            console.log('First following ID type:', typeof currentUser.following[0]);
            console.log('First following ID:', currentUser.following[0]);
            console.log('First following ID is ObjectId:', currentUser.following[0] instanceof mongoose.Types.ObjectId);
        }
        
        if (!currentUser.following || currentUser.following.length === 0) {
            console.log('User has no following - returning empty story rings');
            return res.status(200).json({ 
                success: true, 
                data: [],
                debug: {
                    reason: 'NO_FOLLOWING',
                    currentUserId: meId,
                    followingCount: 0
                }
            });
        }
        
        // Normalize IDs as strings, dedupe, then convert to ObjectId
        const me = meId.toString();
        const followingStr = (currentUser.following || []).map(x => x.toString());
        const uniqueStr = [...new Set([me, ...followingStr])];
        const authors = uniqueStr.map(s => new mongoose.Types.ObjectId(s));
        
        console.log('Me ID (string):', me);
        console.log('Following IDs (strings):', followingStr);
        console.log('Unique IDs (strings):', uniqueStr);
        console.log('Authors (ObjectIds):', authors.map(id => id.toString()));
        console.log('Authors length:', authors.length);
        
        console.log('Raw following IDs:', currentUser.following);
        console.log('First two authors:', authors.slice(0, 2).map(id => id.toString()));
        

        
        // Use a more lenient query filter - show users even without stories
        const queryFilter = { 
            _id: { $in: authors }
            // Removed storyImageUrl filter to show all followed users
        };
        
        // Now both queries are the same since we removed the storyImageUrl filter
        const queryFilterNoStory = {
            _id: { $in: authors }
        };
        
        console.log('Query filter (now same for both):', JSON.stringify(queryFilter, null, 2));
        console.log('Authors in query:', authors.map(id => id.toString()));
        
        // Both queries now return the same results
        const usersNoFilter = await User.find(queryFilterNoStory).select('username avatarUrl storyImageUrl').lean();
        console.log('Users found (no story filter needed):', usersNoFilter.length);
        console.log('Returned IDs:', usersNoFilter.map(u => u._id.toString()));
        
        // Check specifically for einav
        const einavUser = usersNoFilter.find(u => u.username && u.username.toLowerCase().includes('einav'));
        if (einavUser) {
            console.log('Einav found in results:', {
                username: einavUser.username,
                hasAvatar: !!einavUser.avatarUrl,
                hasStory: !!einavUser.storyImageUrl,
                storyImageUrl: einavUser.storyImageUrl
            });
        } else {
            console.log('Einav NOT found in results');
            // Check if einav exists in database at all
            const einavInDB = await User.findOne({ username: { $regex: 'einav', $options: 'i' } }).select('username storyImageUrl').lean();
            if (einavInDB) {
                console.log('Einav exists in DB but not in results:', {
                    username: einavInDB.username,
                    hasStory: !!einavInDB.storyImageUrl,
                    storyImageUrl: einavInDB.storyImageUrl
                });
            } else {
                console.log('Einav does not exist in database at all');
            }
        }
        
        // Use the same results
        const users = usersNoFilter;
        console.log('Query executed with NO LIMIT, NO SLICE');
        
        console.log('Users with stories found:', users.length);
        console.log('Raw query result:', users);
        
        // No more comparison needed - both queries return the same results
        console.log('Results:');
        console.log('  - Total users found:', users.length, 'users');
        console.log('  - All followed users are now included (no story filter)');
        

        
        // Log all users found for debugging
        if (users.length > 0) {
            users.forEach((user, index) => {
                console.log(`User ${index + 1}:`, {
                    _id: user._id,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                    storyImageUrl: user.storyImageUrl,
                    hasAvatar: !!user.avatarUrl,
                    hasStoryImage: !!user.storyImageUrl
                });
            });
        } else {
            console.log('No users found with stories - checking why...');
            console.log('Authors array was:', authors.map(id => id.toString()));
            console.log('Query filter was:', JSON.stringify(queryFilter, null, 2));
        }
        
        // Format response for frontend - relaxed validation
        const storyRings = users.map(user => ({
            ownerId: user._id.toString(),
            username: user.username,
            avatarUrl: user.avatarUrl || null,
            storyImageUrl: user.storyImageUrl || null,
            isMe: user._id.toString() === me
        }));
        
        console.log('Story rings formatted:', storyRings.length);
        if (storyRings.length > 0) {
            console.log('Sample ring:', storyRings[0]);
            console.log('Sample ring validation:', {
                hasOwnerId: !!storyRings[0].ownerId,
                hasUsername: !!storyRings[0].username,
                hasAvatarUrl: !!storyRings[0].avatarUrl,
                hasStoryImageUrl: !!storyRings[0].storyImageUrl,
                isMe: storyRings[0].isMe
            });
        }
        
        console.log('Final response:', {
            success: true,
            dataLength: storyRings.length,
            data: storyRings
        });
        

        
        res.status(200).json({
            success: true,
            data: storyRings
        });
        
    } catch (error) {
        console.error('Error getting story rings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get story rings'
        });
    }
};

// Update user's story image URL
exports.updateUserStory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { storyImageUrl } = req.body;
        
        if (!storyImageUrl) {
            return res.status(400).json({
                success: false,
                error: 'storyImageUrl is required'
            });
        }
        
        // Only allow users to update their own story
        if (req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'You can only update your own story'
            });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { storyImageUrl },
            { new: true, runValidators: true }
        ).select('username avatarUrl storyImageUrl');
        
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: updatedUser
        });
        
    } catch (error) {
        console.error('Error updating user story:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user story'
        });
    }
};

// Get story by owner ID
exports.getStoryByOwner = async (req, res) => {
    try {
        const { ownerId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(ownerId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid owner ID'
            });
        }
        
        const story = await Story.findOne({ owner: ownerId })
            .populate('owner', 'username avatarUrl');
            
        if (!story) {
            return res.status(404).json({
                success: false,
                error: 'Story not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: story
        });
        
    } catch (error) {
        console.error('Error getting story by owner:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get story'
        });
    }
};
