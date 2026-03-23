const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['follow', 'like', 'comment'], 
        required: true 
    },
    post: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post' 
    },
    comment: { 
        type: String 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true
});

// Indexes for better query performance
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ sender: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
