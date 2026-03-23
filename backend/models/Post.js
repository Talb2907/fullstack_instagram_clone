const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String }, // URL or path to image (legacy field)
    mediaUrl: { type: String }, // New field for media (image/video) URL
    mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'text' },
    hashtags: [{ type: String }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    shareCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    facebookPostId: { type: String } // Store Facebook post ID for deletion
}, {
    timestamps: true // adds createdAt and updatedAt
});

PostSchema.index({ createdAt: 1 }); // for efficient date search
PostSchema.index({ author: 1 }); // for efficient author search
PostSchema.index({ hashtags: 1 }); // for efficient hashtag search

module.exports = mongoose.model('Post', PostSchema); 