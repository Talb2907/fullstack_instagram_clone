const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: false // Keep username case-sensitive
    },
    email: {
        type: String, 
        unique: true, 
        sparse: true,
        trim: true,
        lowercase: true // Always store email in lowercase
    },
    phone: {
        type: String, 
        unique: true, 
        sparse: true,
        trim: true
    },
    password: {
        type: String, 
        required: true
    },
    avatarUrl: {
        type: String
    }, // URL to user's profile picture
    location: {
        type: String,
        trim: true
    }, // User's city/location for display and mapping
    bio: {
        type: String,
        trim: true,
        maxlength: 500
    }, // User's bio/description
    profilePicture: {
        type: String
    }, // Alternative name for avatarUrl
    following: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }], // Users this user follows
    followers: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }], // Users who follow this user
    groups: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Group'
    }]
}, {
    timestamps: true, // Add createdAt and updatedAt
    // Custom validation: require at least one of email or phone
    validate: {
        validator: function() {
            return !!(this.email || this.phone);
        },
        message: 'יש להזין אימייל או מספר טלפון.'
    }
});

// Pre-save middleware to normalize data
UserSchema.pre('save', function(next) {
    // Normalize email to lowercase and trim
    if (this.email && typeof this.email === 'string') {
        this.email = this.email.trim().toLowerCase();
    }
    
    // Normalize username and phone (trim only, keep case)
    if (this.username && typeof this.username === 'string') {
        this.username = this.username.trim();
    }
    
    if (this.phone && typeof this.phone === 'string') {
        this.phone = this.phone.trim();
    }
    
    next();
});

// Pre-update middleware for findOneAndUpdate operations
UserSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    
    if (update.email && typeof update.email === 'string') {
        update.email = update.email.trim().toLowerCase();
    }
    
    if (update.username && typeof update.username === 'string') {
        update.username = update.username.trim();
    }
    
    if (update.phone && typeof update.phone === 'string') {
        update.phone = update.phone.trim();
    }
    
    next();
});

// Create indexes for better query performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ following: 1 });
UserSchema.index({ followers: 1 });

module.exports = mongoose.model('User', UserSchema);