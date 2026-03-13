const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['friend_request', 'friend_accepted', 'watch_invite', 'event_invite', 'system', 'profile_view'], required: true },
  message: { type: String, required: true },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'FriendRequest' },
  relatedRoomId: { type: String },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
