const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const axios = require('axios');

// Get following users with geo data
router.get('/geo', auth, async (req, res) => {
  try {
    console.log('Getting geo data for following users, user ID:', req.user.id || req.user.userId);
    
    // Get current user's following list  
    const userId = req.user.id || req.user.userId;
    const currentUser = await User.findById(userId).populate('following', 'username profilePicture avatarUrl location');
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Current user found:', currentUser.username);
    console.log('Following field exists:', !!currentUser.following);
    console.log('Found following users:', currentUser.following ? currentUser.following.length : 0);
    
    // Debug: Show all users and their location data
    console.log('=== ALL FOLLOWING USERS LOCATION DATA ===');
    currentUser.following.forEach((user, index) => {
      console.log(`User ${index + 1}: ${user.username}`);
      console.log(`  - location: "${user.location}"`);
    });

    const followingWithGeo = [];

    // Check if user has any following
    if (!currentUser.following || currentUser.following.length === 0) {
      console.log('User has no following users');
      return res.json([]); // Return empty array
    }

    // Process each followed user
    for (const followedUser of currentUser.following) {
      try {
        let lat = followedUser.latitude;
        let lng = followedUser.longitude;
        
        console.log(`=== Processing user: ${followedUser.username} ===`);
        console.log(`Raw DB data:`, {
          location: followedUser.location
        });
        
        // Get city from location field
        let city = followedUser.location; 
        
        // If no city found in DB, skip this user completely
        if (!city || city.trim() === '') {
          console.log(`WARNING: No city found for user ${followedUser.username}, skipping this user`);
          continue; // Skip this user entirely
        }
        
        // Clean city name - remove country if present and focus on city only
        if (city.includes(',')) {
          city = city.split(',')[0].trim(); // Take only the city part
        }
        
        console.log(`Final city for ${followedUser.username}: ${city}`);

        // Force re-geocoding to ensure we use the correct location data
        console.log(`Geocoding ${followedUser.username} for city: ${city}`);
        
        try {
          // Use Google Geocoding API - specifically request city center
          const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
              address: `${city} city center, Israel`, // Focus on city center
              key: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBBsy13tTl268IL-chlMBDF8lFqAgQ3tcg'
            }
          });

          if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
            const location = geocodeResponse.data.results[0].geometry.location;
            lat = location.lat;
            lng = location.lng;

            // Note: We don't save coordinates back to DB since we removed those fields
            // The geocoding is done on-demand for each request

            console.log(`Geocoded city center for ${followedUser.username} in ${city}: ${lat}, ${lng}`);
          } else {
            console.log(`No geocoding results for city: ${city}, skipping this user`);
            continue; // Skip this user if we can't geocode their city
          }
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError.message);
          console.log(`Failed to geocode ${city} for user ${followedUser.username}, skipping`);
          continue; // Skip this user if geocoding fails
        }

        // Add small random offset to prevent exact overlaps within the same city
        const offsetLat = lat + (Math.random() - 0.5) * 0.01; // ~1km offset for city spread
        const offsetLng = lng + (Math.random() - 0.5) * 0.01;

        // Use profilePicture or avatarUrl field, with fallback
        const avatarUrl = followedUser.profilePicture || followedUser.avatarUrl || '/images/profile.jpg';
        
        followingWithGeo.push({
          userId: followedUser._id,
          username: followedUser.username,
          avatarUrl: avatarUrl,
          city: city,
          lat: offsetLat,
          lng: offsetLng
        });

        console.log(`Added user to geo data: ${followedUser.username} at ${city} (${offsetLat}, ${offsetLng})`);

      } catch (userError) {
        console.error(`Error processing user ${followedUser.username}:`, userError.message);
        // Skip this user but continue with others
        continue;
      }
    }

    console.log(`Returning ${followingWithGeo.length} users with geo data`);
    res.json(followingWithGeo);

  } catch (error) {
    console.error('Error getting following geo data:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Debug route to check user's following status
router.get('/debug', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userInfo = {
      userId: currentUser._id,
      username: currentUser.username,
      followingCount: currentUser.following ? currentUser.following.length : 0,
      followingIds: currentUser.following || [],
      hasFollowingField: !!currentUser.following
    };

    console.log('Debug user info:', userInfo);
    res.json(userInfo);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed', details: error.message });
  }
});



// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Following routes working!', timestamp: new Date().toISOString() });
});

module.exports = router;
