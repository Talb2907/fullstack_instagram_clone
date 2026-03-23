//connect to facebook api
const axios = require('axios');

// Share post to Facebook Page
exports.shareToFacebook = async (req, res) => {
    try {
        const { postId, content, mediaUrl, mediaType } = req.body;
        
        if (!postId || !content) {
            return res.status(400).json({ 
                success: false, 
                error: 'Post ID and content are required' 
            });
        }

        const pageId = process.env.PAGE_ID;
        const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;

        if (!pageId || !pageAccessToken) {
            console.error('Facebook Page credentials not configured');
            return res.status(500).json({ 
                success: false, 
                error: 'Facebook Page not configured' 
            });
        }

        let facebookResponse;

        if (mediaUrl && mediaType === 'image') {
            // Post with image - use absolute URL
            // Ensure we use HTTPS if the request is secure or if we're in production
            const protocol = req.secure || req.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
            const imageUrl = `${protocol}://${req.get('host')}${mediaUrl}`;
            console.log('Attempting to share image to Facebook:', imageUrl);
            
            try {
                // First, try to upload the image directly using multipart form data
                const FormData = require('form-data');
                const fs = require('fs');
                const path = require('path');
                
                // Get the full path to the image file
                const imagePath = path.join(__dirname, '..', mediaUrl);
                console.log('Image path:', imagePath);
                
                // Check if file exists
                if (fs.existsSync(imagePath)) {
                    const form = new FormData();
                    form.append('source', fs.createReadStream(imagePath));
                    form.append('caption', content);
                    form.append('access_token', pageAccessToken);
                    form.append('published', 'true'); // Ensure the photo is published immediately
                    
                    facebookResponse = await axios.post(
                        `https://graph.facebook.com/v18.0/${pageId}/photos`,
                        form,
                        {
                            headers: {
                                ...form.getHeaders(),
                            },
                            timeout: 60000, // 60 second timeout for file upload
                        }
                    );
                    console.log('Image uploaded successfully to Facebook!');
                } else {
                    throw new Error('Image file not found on server');
                }
            } catch (imageError) {
                console.error('Failed to upload image directly, trying URL method:', imageError.response?.data || imageError.message);
                
                try {
                    // First, verify the image URL is accessible
                    console.log('Verifying image URL accessibility:', imageUrl);
                    const imageCheck = await axios.head(imageUrl, { timeout: 10000 });
                    console.log('Image URL is accessible, status:', imageCheck.status);
                    
                    // Fallback: try URL method with better error handling
                    facebookResponse = await axios.post(
                        `https://graph.facebook.com/v18.0/${pageId}/photos`,
                        {
                            url: imageUrl,
                            caption: content,
                            access_token: pageAccessToken,
                            published: 'true' // Ensure the photo is published immediately
                        },
                        {
                            timeout: 30000, // 30 second timeout
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (compatible; SocialMediaBot/1.0)'
                            }
                        }
                    );
                    console.log('Image shared via URL successfully to Facebook!');
                } catch (urlError) {
                    console.error('URL method also failed, trying text-only post:', urlError.response?.data || urlError.message);
                    // Final fallback to text-only post
                    facebookResponse = await axios.post(
                        `https://graph.facebook.com/v18.0/${pageId}/feed`,
                        {
                            message: `${content}\n\n[תמונה: ${imageUrl}]`,
                            access_token: pageAccessToken
                        }
                    );
                    console.log('Fallback text post shared to Facebook!');
                }
            }
        } else {
            // Text-only post
            facebookResponse = await axios.post(
                `https://graph.facebook.com/v18.0/${pageId}/feed`,
                {
                    message: content,
                    access_token: pageAccessToken
                }
            );
        }

        console.log('Facebook post created successfully:', facebookResponse.data);

        // Save Facebook post ID to the database
        const Post = require('../models/Post');
        await Post.findByIdAndUpdate(postId, { 
            facebookPostId: facebookResponse.data.id 
        });

        res.status(200).json({
            success: true,
            data: {
                facebookPostId: facebookResponse.data.id,
                message: 'Post shared to Facebook successfully'
            }
        });

    } catch (error) {
        console.error('Error sharing to Facebook:', error.response?.data || error.message);
        
        // Log the error but don't fail the request
        res.status(200).json({
            success: false,
            error: 'Failed to share to Facebook',
            details: error.response?.data?.error?.message || error.message
        });
    }
};

// Delete post from Facebook
exports.deleteFromFacebook = async (req, res) => {
    try {
        const { facebookPostId } = req.body;
        
        if (!facebookPostId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Facebook Post ID is required' 
            });
        }

        const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;

        if (!pageAccessToken) {
            console.error('Facebook Page access token not configured');
            return res.status(500).json({ 
                success: false, 
                error: 'Facebook Page not configured' 
            });
        }

        // Delete the post from Facebook
        const facebookResponse = await axios.delete(
            `https://graph.facebook.com/v18.0/${facebookPostId}`,
            {
                params: {
                    access_token: pageAccessToken
                }
            }
        );

        console.log('Facebook post deleted successfully:', facebookResponse.data);

        res.status(200).json({
            success: true,
            data: {
                message: 'Post deleted from Facebook successfully'
            }
        });

    } catch (error) {
        console.error('Error deleting from Facebook:', error.response?.data || error.message);
        
        // Log the error but don't fail the request
        res.status(200).json({
            success: false,
            error: 'Failed to delete from Facebook',
            details: error.response?.data?.error?.message || error.message
        });
    }
};

// Get Facebook page info
exports.getPageInfo = async (req, res) => {
    try {
        const pageId = process.env.PAGE_ID;

        if (!pageId) {
            console.error('Facebook Page ID not configured in environment variables');
            return res.status(200).json({ 
                success: false, 
                error: 'Facebook Page ID not configured. Please set PAGE_ID in your .env file.',
                pageId: null
            });
        }

        res.status(200).json({
            success: true,
            data: {
                pageId: pageId
            }
        });

    } catch (error) {
        console.error('Error getting Facebook page info:', error);
        
        res.status(200).json({
            success: false,
            error: 'Failed to get Facebook page info',
            details: error.message,
            pageId: null
        });
    }
};