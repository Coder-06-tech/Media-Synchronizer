const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  profilePic: { type: String },
  status: { type: String, enum: ['online', 'offline', 'in-room'], default: 'offline' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hasSelectedInitialFriends: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
