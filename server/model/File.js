const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  isDirectory: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure uniqueness of a file path within a project for a user
fileSchema.index({ userId: 1, projectName: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('File', fileSchema);
