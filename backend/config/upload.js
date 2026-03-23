const multer = require('multer');
const path = require('path');
const fs = require('fs');

// all the files willl be saved in the uploads directory
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('Created uploads directory:', UPLOADS_DIR);
}

// how the files will be saved in the 'uploads' 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    const safeFilename = `${timestamp}-${random}${ext}`;
    console.log('Upload - Generated safe filename:', safeFilename, 'for original:', file.originalname);
    cb(null, safeFilename);
  }
});

//  for image uploads
const uploadImage = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// for media uploads (images and videos)
const uploadMedia = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('Media upload - File filter checking:', file.originalname, file.mimetype);
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

//export the functions to other files
module.exports = {
  UPLOADS_DIR,
  uploadImage,
  uploadMedia,
  storage
};
