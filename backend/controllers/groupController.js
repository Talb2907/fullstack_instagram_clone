const Group = require('../models/Group');

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { name, category, description, pickedAvatarUrl } = req.body;
    
    let imageUrl;
    
    // if the user uploaded a file, use it
    if (req.file) {
      // Use uploaded file - ensure safe filename
      imageUrl = `/uploads/${req.file.filename}`;
      console.log('Using uploaded file:', imageUrl);
      console.log('  - File details:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } else if (pickedAvatarUrl && pickedAvatarUrl.trim() !== '') {
      // Use selected gallery image
      imageUrl = pickedAvatarUrl;
      console.log('Using picked gallery image:', imageUrl);
    } else {
      // default image 
      imageUrl = '/images/profile.jpg';
      console.log('Using default image:', imageUrl);
    }
    
    // Ensure imageUrl is never empty
    if (!imageUrl || imageUrl.trim() === '') {
      imageUrl = '/images/profile.jpg';
      console.log('Falling back to default image:', imageUrl);
    }
    
    console.log('Final imageUrl for group:', imageUrl);
    
    // Create group with current user as first member and admin
    const group = new Group({ 
      name, 
      description: description || '',
      category: category || '',
      imageUrl,
      members: [req.user.id], // Add current user as first member
      admin: req.user.id // Set current user as admin
    });
    
    console.log('Creating group with imageUrl:', imageUrl);
    //wait for the group to be saved
    await group.save();
    
    // group details
    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl');
    
    console.log('Group saved successfully:', populatedGroup);
    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl');
    res.status(200).json(groups);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get groups of current user
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl')
      .sort({ createdAt: -1 });
    res.status(200).json(groups);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get group by ID
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl');
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.status(200).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Join a group
exports.joinGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    console.log('=== JOIN GROUP ===');
    console.log('Group ID:', groupId);
    console.log('User ID:', userId);

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'הקבוצה לא נמצאה',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'אתה כבר חבר בקבוצה זו',
        code: 'ALREADY_MEMBER'
      });
    }

    // Add user to group
    group.members.push(userId);
    await group.save();

    console.log('User joined group successfully');

    // Populate the updated group
    const populatedGroup = await Group.findById(groupId)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl');

    res.status(200).json({
      success: true,
      message: 'הצטרפת לקבוצה בהצלחה!',
      data: populatedGroup
    });

  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בהצטרפות לקבוצה',
      code: 'JOIN_GROUP_ERROR',
      details: error.message
    });
  }
};

// Leave a group
exports.leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    console.log('=== LEAVE GROUP ===');
    console.log('Group ID:', groupId);
    console.log('User ID:', userId);

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'הקבוצה לא נמצאה',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        error: 'אתה לא חבר בקבוצה זו',
        code: 'NOT_MEMBER'
      });
    }

    // Check if user is admin (admin cannot leave)
    if (group.admin && group.admin.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'מנהל הקבוצה לא יכול לעזוב את הקבוצה',
        code: 'ADMIN_CANNOT_LEAVE'
      });
    }

    // Remove user from group
    group.members = group.members.filter(memberId => memberId.toString() !== userId);
    await group.save();

    console.log('User left group successfully');

    // Populate the updated group
    const populatedGroup = await Group.findById(groupId)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl');

    res.status(200).json({
      success: true,
      message: 'יצאת מהקבוצה בהצלחה!',
      data: populatedGroup
    });

  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה ביציאה מהקבוצה',
      code: 'LEAVE_GROUP_ERROR',
      details: error.message
    });
  }
};

// Update group
exports.updateGroup = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    
    // Check if user is admin of the group
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only group admin can update group' });
    }
    
    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      { name, description, category },
      { new: true, runValidators: true }
    ).populate('members', 'username email avatarUrl').populate('admin', 'username avatarUrl');
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete group
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only group admin can delete group' });
    }
    
    // Delete the group
    await Group.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}; 

// Add a post to a group
exports.addPostToGroup = async (req, res) => {
  try {
    const { groupId, postId } = req.body;
    const group = await Group.findByIdAndUpdate(groupId, { $push: { posts: postId } }, { new: true });
    res.status(200).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Check if user is admin of group
exports.isGroupAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const isAdmin = group.admin.toString() === req.user.id;
    res.status(200).json({ isAdmin });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add member to group (admin only)
exports.addMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    
    // Validate memberId
    if (!memberId || memberId === 'undefined' || memberId === 'null') {
      return res.status(400).json({ error: 'Invalid member ID provided' });
    }
    
    // Validate ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: 'Invalid member ID format' });
    }
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only group admin can add members' });
    }
    
    // Check if member is already in the group
    if (group.members.includes(memberId)) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }
    
    // Add member
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: memberId } },
      { new: true }
    ).populate('members', 'username email avatarUrl').populate('admin', 'username avatarUrl');
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error adding member to group:', error);
    res.status(400).json({ error: error.message });
  }
};

// Remove member from group (admin only)
exports.removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    
    // Validate memberId
    if (!memberId || memberId === 'undefined' || memberId === 'null') {
      return res.status(400).json({ error: 'Invalid member ID provided' });
    }
    
    // Validate ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: 'Invalid member ID format' });
    }
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only group admin can remove members' });
    }
    
    // Remove member
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: memberId } },
      { new: true }
    ).populate('members', 'username email avatarUrl').populate('admin', 'username avatarUrl');
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error removing member from group:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get groups by category with enhanced filtering
exports.getGroupsByCategory = async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    
    // Validate required parameters
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category parameter is required',
        code: 'MISSING_CATEGORY'
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number',
        code: 'INVALID_PAGE'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 50',
        code: 'INVALID_LIMIT'
      });
    }

    // Build query for exact category match
    const query = { category };

    // Calculate skip for pagination
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination and population
    const groups = await Group.find(query)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl')
      .populate('posts', 'title content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Group.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    // Build pagination info
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true,
      data: groups,
      pagination
    });

  } catch (error) {
    console.error('Error in getGroupsByCategory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups by category',
      code: 'FILTER_ERROR'
    });
  }
};

// Get groups by name with filtering options
exports.getGroupsByName = async (req, res) => {
  try {
    const { name, exact = 'false', page = 1, limit = 10 } = req.query;
    
    // Validate required parameters
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name parameter is required',
        code: 'MISSING_NAME'
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number',
        code: 'INVALID_PAGE'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 50',
        code: 'INVALID_LIMIT'
      });
    }

    // Build query based on exact parameter
    let query = {};
    if (exact === 'true') {
      query.name = name; // Exact match
    } else {
      query.name = { $regex: name, $options: 'i' }; // Case-insensitive partial match
    }

    // Calculate skip for pagination
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination and population
    const groups = await Group.find(query)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl')
      .populate('posts', 'title content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Group.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    // Build pagination info
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true,
      data: groups,
      pagination
    });

  } catch (error) {
    console.error('Error in getGroupsByName:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups by name',
      code: 'FILTER_ERROR'
    });
  }
};

// Get groups by date range with filtering options
exports.getGroupsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
        code: 'MISSING_DATES'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Parse dates and validate
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date values',
        code: 'INVALID_DATE_VALUES'
      });
    }

    // Validate date range (start should be before end)
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before or equal to end date',
        code: 'INVALID_DATE_RANGE'
      });
    }

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number',
        code: 'INVALID_PAGE'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 50',
        code: 'INVALID_LIMIT'
      });
    }

    // Set end date to end of day for inclusive range
    end.setHours(23, 59, 59, 999);

    // Build query for date range
    const query = {
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    // Calculate skip for pagination
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination and population
    const groups = await Group.find(query)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl')
      .populate('posts', 'title content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Group.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    // Build pagination info
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true,
      data: groups,
      pagination
    });

  } catch (error) {
    console.error('Error in getGroupsByDateRange:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups by date range',
      code: 'FILTER_ERROR'
    });
  }
};

// Get groups with combined filters
exports.getGroupsWithFilters = async (req, res) => {
  try {
    const { 
      name, 
      category, 
      startDate, 
      endDate, 
      exact = 'false',
      page = 1, 
      limit = 10 
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number',
        code: 'INVALID_PAGE'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 50',
        code: 'INVALID_LIMIT'
      });
    }

    // Build dynamic query object
    const query = {};

    // Add name filter if provided
    if (name) {
      if (exact === 'true') {
        query.name = name; // Exact match
      } else {
        query.name = { $regex: name, $options: 'i' }; // Case-insensitive partial match
      }
    }

    // Add category filter if provided
    if (category) {
      query.category = category;
    }

    // Add date range filter if provided
    if (startDate && endDate) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT'
        });
      }

      // Parse dates and validate
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date values',
          code: 'INVALID_DATE_VALUES'
        });
      }

      // Validate date range (start should be before end)
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'Start date must be before or equal to end date',
          code: 'INVALID_DATE_RANGE'
        });
      }

      // Set end date to end of day for inclusive range
      end.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Check if at least one filter is provided
    if (Object.keys(query).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one filter parameter is required',
        code: 'MISSING_FILTERS'
      });
    }

    // Calculate skip for pagination
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination and population
    const groups = await Group.find(query)
      .populate('members', 'username email avatarUrl')
      .populate('admin', 'username avatarUrl')
      .populate('posts', 'title content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Group.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    // Build pagination info
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true,
      data: groups,
      pagination
    });

  } catch (error) {
    console.error('Error in getGroupsWithFilters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups with filters',
      code: 'FILTER_ERROR'
    });
  }
};

// Advanced group search with admin name, creation year, and member count
exports.advancedGroupSearch = async (req, res) => {
  try {
    const { 
      adminName,
      creationYear, 
      minMembers,
      maxMembers,
      page = 1, 
      limit = 10 
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 50'
      });
    }

    // Build aggregation pipeline
    const pipeline = [];

    // Stage 1: Populate admin info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'admin',
        foreignField: '_id',
        as: 'adminInfo'
      }
    });

    // Stage 2: Add computed fields
    pipeline.push({
      $addFields: {
        adminInfo: { $arrayElemAt: ['$adminInfo', 0] },
        memberCount: { $size: '$members' },
        creationYear: { $year: '$createdAt' }
      }
    });

    // Stage 3: Build match conditions
    const matchConditions = {};

    // Filter by admin name if provided
    if (adminName && adminName.trim()) {
      matchConditions['adminInfo.username'] = {
        $regex: adminName.trim(),
        $options: 'i'
      };
    }

    // Filter by creation year if provided
    if (creationYear) {
      const year = parseInt(creationYear);
      if (!isNaN(year) && year >= 2020 && year <= 2025) {
        matchConditions.creationYear = year;
      }
    }

    // Filter by member count range if provided
    if (minMembers || maxMembers) {
      matchConditions.memberCount = {};
      
      if (minMembers) {
        const min = parseInt(minMembers);
        if (!isNaN(min) && min >= 1) {
          matchConditions.memberCount.$gte = min;
        }
      }
      
      if (maxMembers) {
        const max = parseInt(maxMembers);
        if (!isNaN(max) && max >= 1) {
          matchConditions.memberCount.$lte = max;
        }
      }
    }

    // Apply match conditions if any
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Stage 4: Sort by creation date (newest first)
    pipeline.push({ $sort: { createdAt: -1 } });

    // Stage 5: Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Group.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Stage 6: Apply pagination
    pipeline.push({ $skip: (pageNum - 1) * limitNum });
    pipeline.push({ $limit: limitNum });

    // Stage 7: Populate additional fields
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'members',
        foreignField: '_id',
        as: 'memberDetails'
      }
    });

    // Execute the aggregation
    const groups = await Group.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    };

    res.status(200).json({
      success: true,
      data: groups,
      pagination,
      searchCriteria: {
        adminName: adminName || null,
        creationYear: creationYear || null,
        minMembers: minMembers || null,
        maxMembers: maxMembers || null
      }
    });

  } catch (error) {
    console.error('Error in advancedGroupSearch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform advanced group search'
    });
  }
};

