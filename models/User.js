const mongoose = require('mongoose');

// =============================================================================
// User Schema
// =============================================================================
// footprintData is stored as a flexible Mixed (plain JS object) field so it can
// hold the entire app state object without requiring a rigid sub-schema.
// =============================================================================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters']
      // Note: password is stored as a bcrypt hash — never plain text
    },
    // Embedded footprint app state — replaces the separate `footprints` table
    footprintData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true // auto-manages createdAt + updatedAt fields
  }
);



module.exports = mongoose.model('User', userSchema);
