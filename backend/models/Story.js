const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    storyImageUrl: {
        type: String,
        required: true
    },
    caption: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: function() {
            // Stories expire after 24 hours
            return new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
StorySchema.index({ owner: 1, isActive: 1 });
StorySchema.index({ expiresAt: 1 });

// Pre-save middleware to check if story has expired
StorySchema.pre('save', function(next) {
    if (this.expiresAt && this.expiresAt < new Date()) {
        this.isActive = false;
    }
    next();
});

module.exports = mongoose.model('Story', StorySchema);
