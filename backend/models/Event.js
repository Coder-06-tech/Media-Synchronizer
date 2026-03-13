const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  date: { type: Date, required: true },
  time: { type: String, required: true },
  linkedWatchRoom: { type: String }, // Links to a VideoRoom ID
  videoSession: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoRoom' } // Alternatively store the Object ID
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
