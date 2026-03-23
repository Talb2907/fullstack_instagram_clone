const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true},
  description: { type: String, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  category: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// quick search
GroupSchema.index({ name: 1 });
GroupSchema.index({ category: 1 });
GroupSchema.index({ createdAt: 1 });
GroupSchema.index({ name: 1, category: 1 });
GroupSchema.index({ category: 1, createdAt: 1 });
GroupSchema.index({ category: 1, name: 1, createdAt: 1 });

module.exports = mongoose.model('Group', GroupSchema); 