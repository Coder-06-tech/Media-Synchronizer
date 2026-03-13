const mongoose = require('mongoose');

const videoRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  broadcaster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  currentTimestamp: { type: Number, default: 0 },
  playingState: { type: String, enum: ['playing', 'paused', 'buffering'], default: 'paused' },
  videoUrl: { type: String }, // Optional: If we support remote URLs later
}, { timestamps: true });

module.exports = mongoose.model('VideoRoom', videoRoomSchema);
