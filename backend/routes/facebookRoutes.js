const express = require('express');
const router = express.Router();
const facebookController = require('../controllers/facebookController');
const auth = require('../middleware/auth');

// Share post to Facebook Page
router.post('/share', auth, facebookController.shareToFacebook);

// Delete post from Facebook Page
router.delete('/delete', auth, facebookController.deleteFromFacebook);

// Get Facebook page info
router.get('/page-info', facebookController.getPageInfo);

module.exports = router;
