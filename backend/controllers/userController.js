const User = require('../models/User');
//password hashing
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const NotificationService = require('../services/notificationService');

// CREATE 
exports.register = async (req, res) => {
    try {
        const { username, email, phone, password, fullName } = req.body;
        if (!email && !phone) {
            return res.status(400).json({ error: 'יש להזין אימייל או מספר טלפון.' });
        }
        // Check for existing username
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'שם המשתמש כבר קיים במערכת' });
        }
        // Check for existing email
        if (email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ error: 'אימייל כבר קיים במערכת' });
            }
        }
        // Check for existing phone
        if (phone) {
            const existingPhone = await User.findOne({ phone });
            if (existingPhone) {
                return res.status(400).json({ error: 'מספר טלפון כבר קיים במערכת' });
            }
        }
        // Hash the password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = new User({ username, password: hashedPassword, email, phone, fullName });
        await user.save(); //DB save
        res.status(201).json(user);
    } catch (error) {
        console.error("there is an error in creating a new user" + error.message);
        res.status(400).json({
            error: error.message
        })
    }
}

// DELETE 
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) res.status(404).json({ error: 'User not found!' })
        res.status(201).json({ message: 'user deleted!' });
    } catch (error) {
        console.error("there is an error in deleting a new user" + error.message);
        res.status(400).json({
            error: error.message
        })
    }
}

// DELETE CURRENT USER (self-delete)
exports.deleteMyAccount = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from authenticated token
        
        // Find and delete the user
        const user = await User.findByIdAndDelete(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Also delete all posts by this user
        const Post = require('../models/Post');
        await Post.deleteMany({ author: userId });

        // Remove user from all other users' followers/following lists
        await User.updateMany(
            { followers: userId },
            { $pull: { followers: userId } }
        );
        await User.updateMany(
            { following: userId },
            { $pull: { following: userId } }
        );

        res.status(200).json({ 
            success: true, 
            message: 'Account deleted successfully' 
        });
        
    } catch (error) {
        console.error('Error deleting user account:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to delete account'
        });
    }
};

// UPDATE 
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // Prevent updating unique fields to values that already exist
        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found!' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(400).json({ error: error.message });
    }
}

// READ : get user by id
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found!' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(400).json({ error: error.message });
    }
}

// Get user profile with posts data
exports.getUserProfileWithPosts = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('=== GET USER PROFILE WITH POSTS ===');
        console.log('User ID:', id);
        
        // Get user data
        const user = await User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Get user's posts
        const Post = require('../models/Post');
        const posts = await Post.find({ author: id, isPublished: true })
            .populate('author', 'username avatarUrl')
            .sort({ createdAt: -1 })
            .limit(50); // Limit to 50 most recent posts
        
        // Get accurate counts
        const postsCount = await Post.countDocuments({ author: id, isPublished: true });
        const followersCount = user.followers ? user.followers.length : 0;
        const followingCount = user.following ? user.following.length : 0;
        
        // Check if current user is following this user
        let isFollowing = false;
        if (req.user && req.user.id !== id) {
            const currentUser = await User.findById(req.user.id);
            isFollowing = currentUser && currentUser.following && currentUser.following.includes(id);
        }
        
        const userProfileData = {
            _id: user._id,
            username: user.username,
            avatarUrl: user.avatarUrl || '/images/profile.jpg',
            bio: user.bio || '',
            followers: user.followers || [],
            following: user.following || [],
            posts: posts,
            postCount: postsCount,
            followersCount: followersCount,
            followingCount: followingCount,
            isFollowing: isFollowing,
            isOwnProfile: req.user && req.user.id === id
        };
        
        console.log('User profile data prepared:', {
            username: userProfileData.username,
            postCount: userProfileData.postCount,
            postsLength: userProfileData.posts.length,
            followersCount: userProfileData.followersCount,
            followingCount: userProfileData.followingCount
        });
        
        res.status(200).json({
            success: true,
            data: userProfileData
        });
        
    } catch (error) {
        console.error('Error fetching user profile with posts:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile',
            code: 'FETCH_USER_PROFILE_ERROR'
        });
    }
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// login – tolerant email match + debug
exports.login = async (req, res) => {
  try {
    let { username, email, password } = req.body || {};
    if (!password || (!username && !email)) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    if (typeof username === 'string') username = username.trim();
    if (typeof email === 'string')    email    = email.trim().toLowerCase();

    const or = [];
    if (username) or.push({ username });
    if (email) {
      // exact normalized
      or.push({ email });
      // case-insensitive + מרשה רווחים בהתחלה/סוף אם נשמרו בטעות
      or.push({ email: { $regex: new RegExp(`^\\s*${escapeRegex(email)}\\s*$`, 'i') } });
    }

    // DEBUG: ודאות שאנחנו ב-DB/collection הנכונים
    const total = await User.countDocuments();
    const any   = await User.findOne({}, 'email username').lean();
    console.log('LOGIN DEBUG → query:', JSON.stringify({ $or: or }));
    console.log('LOGIN DEBUG → users count:', total, 'sample:', any);

    const user = await User.findOne({ $or: or });
    if (!user) {
      return res.status(401).json({
        error: 'User not found!',
        debug: { searchedFor: { email }, searchQueries: or.length }
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid password!' });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '2h' }
    );

    const safeUser = user.toObject(); delete safeUser.password;
    return res.status(200).json({ message: 'Login successful', user: safeUser, token });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: 'Login failed' });
  }
};

  

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const users = await User.find()
            .select('-password')
            .populate('friends', 'username profile.firstName profile.lastName')
            .populate('groups', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await User.countDocuments();
        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            code: 'FETCH_USERS_ERROR'
        });
    }
};

// Get all users for search (without pagination)
exports.getAllUsersForSearch = async (req, res) => {
    try {
        console.log('=== GET ALL USERS FOR SEARCH ===');
        console.log('Request user:', req.user);
        console.log('Request user ID:', req.user?.id);
        
        // Get all users without pagination, excluding current user
        const currentUserId = req.user?.id;
        
        if (!currentUserId) {
            console.error('No user ID found in request');
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                code: 'USER_NOT_AUTHENTICATED'
            });
        }
        
        console.log('Searching for users, excluding:', currentUserId);
        
        const users = await User.find({ 
            _id: { $ne: currentUserId } // Exclude current user only
        })
        .select('-password -email -phone') // Exclude sensitive information, include avatarUrl
        .populate('followers', '_id username avatarUrl') // Include followers with ID, username and avatar
        .sort({ username: 1 }); // Sort alphabetically by username
        
        console.log(`Found ${users.length} users for search`);
        
        // Log first few users for debugging
        if (users.length > 0) {
            console.log('Sample users:');
            users.slice(0, 3).forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.username} (ID: ${user._id}) - Avatar: ${user.avatarUrl || 'NO AVATAR'}`);
            });
        }
        
        res.status(200).json({
            success: true,
            data: users,
            total: users.length
        });
        
    } catch (error) {
        console.error('Error fetching users for search:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users for search',
            code: 'FETCH_USERS_SEARCH_ERROR',
            details: error.message
        });
    }
};

// Search users by username pattern
exports.getUsersByUsername = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username query parameter is required',
                code: 'MISSING_USERNAME'
            });
        }
        const user = await User.findOne({
            username: { $regex: username, $options: 'i' }
        }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error searching user:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search user',
            code: 'SEARCH_USER_ERROR'
        });
    }
};

// Search users by email pattern
exports.getUsersByEmail = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email query parameter is required',
                code: 'MISSING_EMAIL'
            });
        }
        const user = await User.findOne({
            email: { $regex: email, $options: 'i' }
        }).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error searching user by email:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to search user by email',
            code: 'SEARCH_USER_EMAIL_ERROR'
        });
    }
};

// Get user's friends list
exports.getUserFriends = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate('friends', 'username profile.firstName profile.lastName');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.status(200).json({
            success: true,
            data: user.friends
        });
    } catch (error) {
        console.error('Error fetching user friends:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user friends',
            code: 'FETCH_USER_FRIENDS_ERROR'
        });
    }
};

// Get user's groups list
exports.getUserGroups = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate('groups', 'name');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        res.status(200).json({
            success: true,
            data: user.groups
        });
    } catch (error) {
        console.error('Error fetching user groups:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user groups',
            code: 'FETCH_USER_GROUPS_ERROR'
        });
    }
};

// Get current user info (for authenticated requests)
exports.getCurrentUser = async (req, res) => {
    try {
        console.log('=== GET CURRENT USER ===');
        console.log('getCurrentUser -> req.user.id =', req.user && req.user.id); // DEBUG
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            console.log('User not found with ID:', userId);
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        console.log('Found user in DB:', {
            id: user._id,
            username: user.username,
            location: user.location,
            avatarUrl: user.avatarUrl
        });
        
        // Use the actual avatar URL from MongoDB - no fallback override
        const avatarUrl = user.avatarUrl;
        console.log(`User ${user.username} - DB avatarUrl:`, avatarUrl);
        
        // Only use fallback if there's absolutely no avatar in the database
        let finalAvatarUrl = avatarUrl;
        if (!avatarUrl || avatarUrl.trim() === '') {
            console.log(`No avatar URL in DB for ${user.username}, using minimal fallback`);
            finalAvatarUrl = '/images/profile.jpg'; // Simple fallback only
        } else {
            console.log(`Using REAL avatar from DB for ${user.username}:`, avatarUrl);
        }
        
        const userData = {
            ...user.toObject(),
            avatarUrl: finalAvatarUrl
        };
        
        console.log(`Final user data being sent:`, {
            id: userData._id,
            username: userData.username,
            location: userData.location,
            avatarUrl: userData.avatarUrl
        });
        
        res.status(200).json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('Error fetching current user:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current user',
            code: 'FETCH_CURRENT_USER_ERROR'
        });
    }
};

// Update user avatar
exports.updateUserAvatar = async (req, res) => {
    try {
        const userId = req.user.id;
        const { avatarUrl } = req.body;
        
        if (!avatarUrl) {
            return res.status(400).json({
                success: false,
                error: 'Avatar URL is required'
            });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatarUrl: avatarUrl },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        console.log(`Updated avatar for user ${updatedUser.username}:`, avatarUrl);
        
        res.status(200).json({
            success: true,
            message: 'Avatar updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user avatar:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to update avatar'
        });
    }
};

// Get stories for current user (placeholder implementation)
exports.getStories = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const stories = [
            {
                ownerId: 'liorzaltsman',
                thumbUrl: 'https://ui-avatars.com/api/?name=liorzaltsman&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=liorzaltsman&background=random&size=400'
            },
            {
                ownerId: 'bigbrother',
                thumbUrl: 'https://ui-avatars.com/api/?name=bigbrother&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=bigbrother&background=random&size=400'
            },
            {
                ownerId: 'tal.boukris',
                thumbUrl: 'https://ui-avatars.com/api/?name=tal.boukris&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=tal.boukris&background=random&size=400'
            },
            {
                ownerId: 'israel_bidur',
                thumbUrl: 'https://ui-avatars.com/api/?name=israel_bidur&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=israel_bidur&background=random&size=400'
            },
            {
                ownerId: 'maya.keyy',
                thumbUrl: 'https://ui-avatars.com/api/?name=maya.keyy&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=maya.keyy&background=random&size=400'
            },
            {
                ownerId: 'gal_gadot',
                thumbUrl: 'https://ui-avatars.com/api/?name=gal_gadot&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=gal_gadot&background=random&size=400'
            },
            {
                ownerId: 'einavcohen',
                thumbUrl: 'https://ui-avatars.com/api/?name=einavcohen&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=einavcohen&background=random&size=400'
            },
            {
                ownerId: 'yehudalevi',
                thumbUrl: 'https://ui-avatars.com/api/?name=yehudalevi&background=random&size=200',
                mediaUrl: 'https://ui-avatars.com/api/?name=yehudalevi&background=random&size=400'
            }
        ];
        
        res.status(200).json(stories);
    } catch (error) {
        console.error('Error fetching stories:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stories',
            code: 'FETCH_STORIES_ERROR'
        });
    }
};

// Get user suggestions - only users the current user doesn't follow
exports.getSuggestions = async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'No user ID in token'
            });
        }
        
        // Get current user's following list (just IDs, no populate needed)
        const currentUser = await User.findById(userId).select('following');
        
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                error: 'Current user not found'
            });
        }
        
        // Get all users except the current user and those they already follow
        const followedUserIds = [...currentUser.following, userId];
        
        // Find users that the current user doesn't follow - simplified query
        const suggestions = await User.find({
            _id: { $nin: followedUserIds }
        })
        .select('username avatarUrl')
        .limit(5) // Reduced limit for faster loading
        .lean();
        
        console.log('Found', suggestions.length, 'suggestions for user:', userId);
        
        // Simplified suggestions without complex mutual follower calculations
        const suggestionsWithAvatar = suggestions.map(user => ({
            _id: user._id,
            username: user.username,
            avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random&size=200`,
            mutualFollowers: '' // Empty string for clean display
        }));
        
        res.status(200).json({
            success: true,
            data: suggestionsWithAvatar
        });
        
    } catch (error) {
        console.error('Error fetching suggestions:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch suggestions',
            code: 'FETCH_SUGGESTIONS_ERROR'
        });
    }
};

// Follow a user
exports.followUser = async (req, res) => {
    try {
        console.log('=== FOLLOW USER ENDPOINT HIT ===');
        console.log('Request params:', req.params);
        console.log('Request user:', req.user);
        console.log('Request headers:', req.headers);
        
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;
        
        console.log('Current user ID:', currentUserId);
        console.log('Target user ID:', targetUserId);
        console.log('Current user ID type:', typeof currentUserId);
        console.log('Target user ID type:', typeof targetUserId);

        // Prevent user from following themselves
        if (currentUserId === targetUserId) {
            console.log('User trying to follow themselves');
            return res.status(400).json({
                success: false,
                error: 'You cannot follow yourself',
                code: 'CANNOT_FOLLOW_SELF'
            });
        }

        // Check if target user exists
        console.log('Looking for target user with ID:', targetUserId);
        const targetUser = await User.findById(targetUserId);
        console.log('Target user found:', targetUser ? 'YES' : 'NO');
        
        if (!targetUser) {
            console.log('Target user not found');
            return res.status(404).json({
                success: false,
                error: 'Target user not found',
                code: 'TARGET_USER_NOT_FOUND'
            });
        }
        
        console.log('Target user found:', targetUser.username);

        // Check if already following
        console.log('Looking for current user with ID:', currentUserId);
        const currentUser = await User.findById(currentUserId);
        console.log('Current user found:', currentUser ? 'YES' : 'NO');
        
        if (!currentUser) {
            console.log('Current user not found');
            return res.status(404).json({
                success: false,
                error: 'Current user not found',
                code: 'CURRENT_USER_NOT_FOUND'
            });
        }
        
        console.log('Current user found:', currentUser.username);
        console.log('Current user following count:', currentUser.following?.length || 0);
        console.log('Current user following IDs:', currentUser.following || []);
        
        if (currentUser.following.includes(targetUserId)) {
            console.log('User already following target');
            return res.status(400).json({
                success: false,
                error: 'You are already following this user',
                code: 'ALREADY_FOLLOWING'
            });
        }
        
        console.log('User not already following target');

        // Add to following list and followers list
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: targetUserId }
        });

        await User.findByIdAndUpdate(targetUserId, {
            $addToSet: { followers: currentUserId }
        });

        // Create follow notification
        await NotificationService.createFollowNotification(targetUserId, currentUserId);

        res.status(200).json({
            success: true,
            message: 'Successfully followed user',
            data: {
                following: true,
                targetUserId: targetUserId
            }
        });

    } catch (error) {
        console.error('Error following user:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to follow user',
            code: 'FOLLOW_USER_ERROR'
        });
    }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.id;

        // Prevent user from unfollowing themselves
        if (currentUserId === targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'You cannot unfollow yourself',
                code: 'CANNOT_UNFOLLOW_SELF'
            });
        }

        // Check if target user exists
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: 'Target user not found',
                code: 'TARGET_USER_NOT_FOUND'
            });
        }

        // Check if not following
        const currentUser = await User.findById(currentUserId);
        if (!currentUser.following.includes(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'You are not following this user',
                code: 'NOT_FOLLOWING'
            });
        }

        // Remove from following list and followers list
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { following: targetUserId }
        });

        await User.findByIdAndUpdate(targetUserId, {
            $pull: { followers: currentUserId }
        });

        res.status(200).json({
            success: true,
            message: 'Successfully unfollowed user',
            data: {
                following: false,
                targetUserId: targetUserId
            }
        });

    } catch (error) {
        console.error('Error unfollowing user:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to unfollow user',
            code: 'UNFOLLOW_USER_ERROR'
        });
    }
};

// Get personalized feed for current user
exports.getPersonalizedFeed = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        
        // Get current user with following list
        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                error: 'Current user not found',
                code: 'CURRENT_USER_NOT_FOUND'
            });
        }

        // If user has no following, return empty feed
        if (!currentUser.following || currentUser.following.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No posts to show. Follow some users to see their posts!',
                data: []
            });
        }

        // Get posts from users the current user follows
        const Post = require('../models/Post');
        const posts = await Post.find({
            author: { $in: currentUser.following },
            isPublished: true
        })
        .populate('author', 'username avatarUrl')
        .populate('comments.author', 'username')
        .sort({ createdAt: -1 }) // Newest first
        .limit(50); // Limit to prevent overwhelming response

        res.status(200).json({
            success: true,
            message: 'Personalized feed loaded successfully',
            data: posts
        });

    } catch (error) {
        console.error('Error loading personalized feed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to load personalized feed',
            code: 'LOAD_FEED_ERROR'
        });
    }
};

// Get user by username (for follow functionality)
exports.getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username parameter is required',
                code: 'MISSING_USERNAME'
            });
        }

        const user = await User.findOne({ username }).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Error fetching user by username:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
            code: 'FETCH_USER_BY_USERNAME_ERROR'
        });
    }
};

// Get current user's following list
exports.getCurrentUserFollowing = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        
        const user = await User.findById(currentUserId)
            .populate('following', 'username email avatarUrl')
            .select('following');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Current user not found',
                code: 'CURRENT_USER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: user.following || []
        });

    } catch (error) {
        console.error('Error fetching current user following:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch following list',
            code: 'FETCH_FOLLOWING_ERROR'
        });
    }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        
        const user = await User.findById(currentUserId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Current user not found',
                code: 'CURRENT_USER_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Error fetching current user:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current user',
            code: 'FETCH_CURRENT_USER_ERROR'
        });
    }
};

// Get current user stats (followers/following counts and posts count)
exports.getCurrentUserStats = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        
        const user = await User.findById(currentUserId).select('followers following');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Current user not found',
                code: 'CURRENT_USER_NOT_FOUND'
            });
        }

        // Get posts count for the current user
        const Post = require('../models/Post');
        const postsCount = await Post.countDocuments({ author: currentUserId, isPublished: true });

        res.status(200).json({
            success: true,
            data: {
                followersCount: user.followers ? user.followers.length : 0,
                followingCount: user.following ? user.following.length : 0,
                postsCount: postsCount
            }
        });

    } catch (error) {
        console.error('Error fetching current user stats:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user stats',
            code: 'FETCH_USER_STATS_ERROR'
        });
    }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { username, location } = req.body;
        
        console.log('=== UPDATE USER PROFILE ===');
        console.log('Current User ID:', currentUserId);
        console.log('Request Body:', req.body);
        console.log('Request File:', req.file);
        console.log('Username to update:', username);
        console.log('Location to update:', location);
        
        // Check if username is being changed and if it's already taken
        if (username) {
            const existingUser = await User.findOne({ username, _id: { $ne: currentUserId } });
            if (existingUser) {
                console.log('Username already taken by user:', existingUser._id);
                return res.status(400).json({
                    success: false,
                    error: 'שם המשתמש כבר קיים במערכת',
                    code: 'USERNAME_TAKEN'
                });
            }
        }
        
        // Prepare update data
        const updateData = {};
        if (username) {
            updateData.username = username;
            console.log('Adding username to update:', username);
        }
        if (location !== undefined) {
            updateData.location = location;
            console.log('Adding location to update:', location);
        }
        
        // Handle avatar upload if present
        if (req.file) {
            updateData.avatarUrl = `/uploads/${req.file.filename}`;
            console.log('Adding avatar to update:', updateData.avatarUrl);
        }
        
        console.log('Final update data:', updateData);
        
        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            currentUserId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!updatedUser) {
            console.log('User not found for update');
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        console.log('User updated successfully:', {
            id: updatedUser._id,
            username: updatedUser.username,
            location: updatedUser.location,
            avatarUrl: updatedUser.avatarUrl
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'שם המשתמש כבר קיים במערכת',
                code: 'USERNAME_DUPLICATE'
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'נתונים לא תקינים',
                code: 'VALIDATION_ERROR',
                details: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            code: 'UPDATE_PROFILE_ERROR',
            details: error.message
        });
    }
};

// Debug endpoint to check current user data
exports.debugCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');
        
        console.log('=== DEBUG CURRENT USER ===');
        console.log('User ID:', userId);
        console.log('User from DB:', user);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json({
            debug: true,
            userId: userId,
            userData: user,
            username: user.username,
            location: user.location,
            avatarUrl: user.avatarUrl
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: 'Debug error', details: error.message });
    }
};

// Get user's following list for sharing
exports.getUserFollowing = async (req, res) => {
    try {
        console.log('Get following request - User ID:', req.user.id);
        
        const user = await User.findById(req.user.id).populate('following', '_id username avatar avatarUrl');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('Following users found:', user.following ? user.following.length : 0);

        // Format following users for sharing
        const followingUsers = user.following.map(followedUser => ({
            id: followedUser._id,
            username: followedUser.username,
            avatarUrl: followedUser.avatarUrl || followedUser.avatar || 'images/profile.jpg'
        }));

        res.json({
            success: true,
            data: followingUsers,
            count: followingUsers.length
        });
    } catch (error) {
        console.error('Error in getUserFollowing:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update current user profile (comprehensive update)
exports.updateCurrentUserProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { username, location, bio } = req.body;
        
        console.log('=== UPDATE CURRENT USER PROFILE ===');
        console.log('Current User ID:', currentUserId);
        console.log('Request Body:', req.body);
        console.log('Request File:', req.file);
        console.log('Username to update:', username);
        console.log('Location to update:', location);
        console.log('Bio to update:', bio);
        
        // Validation
        if (!username || username.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'שם משתמש חייב להיות לפחות 2 תווים'
            });
        }
        
        // Check if username is already taken by another user
        const existingUser = await User.findOne({ 
            username: username.trim(), 
            _id: { $ne: currentUserId } 
        });
        
        if (existingUser) {
            console.log('Username already taken by user:', existingUser._id);
            return res.status(400).json({
                success: false,
                message: 'שם משתמש זה כבר קיים במערכת'
            });
        }
        
        // Prepare update data
        const updateData = {
            username: username.trim(),
            location: location ? location.trim() : '',
            bio: bio ? bio.trim() : ''
        };
        
        // Handle avatar upload if provided
        if (req.file) {
            updateData.avatarUrl = `/uploads/${req.file.filename}`;
            console.log('Avatar uploaded:', updateData.avatarUrl);
        }
        
        console.log('Final update data:', updateData);
        
        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(
            currentUserId,
            updateData,
            { new: true, runValidators: true }
        ).select('username location bio avatarUrl');
        
        if (!updatedUser) {
            console.log('User not found for update');
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log('Profile updated successfully:', updatedUser);
        
        res.status(200).json({
            success: true,
            message: 'הפרופיל עודכן בהצלחה',
            data: {
                username: updatedUser.username,
                location: updatedUser.location,
                bio: updatedUser.bio,
                avatarUrl: updatedUser.avatarUrl
            }
        });
        
    } catch (error) {
        console.error('Error updating current user profile:', error);
        
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'שם המשתמש כבר קיים במערכת'
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'נתונים לא תקינים',
                details: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'שגיאה פנימית בשרת'
        });
    }
};