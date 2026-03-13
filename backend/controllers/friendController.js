const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');

// Send a friend request
const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already friends
    const sender = await User.findById(senderId);
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    const request = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId
    });

    // Create notification
    const notification = await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      message: `${sender.name} sent you a friend request`,
      relatedUser: senderId
    });

    // Emit socket event if user is online
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('new_notification', notification);
    }

    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.receiver.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // Update status
    request.status = 'accepted';
    await request.save();

    // Add to friends lists
    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
    const receiverUser = await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

    // Create notification for sender
    const notification = await Notification.create({
      userId: request.sender,
      type: 'friend_accepted',
      message: `${receiverUser.name} accepted your friend request`,
      relatedUser: request.receiver
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${request.sender}`).emit('new_notification', notification);
      
      // Also notify both parties to refresh their friend list
      io.to(`user_${request.sender}`).emit('friend_list_updated');
      io.to(`user_${request.receiver}`).emit('friend_list_updated');
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Decline friend request
const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.receiver.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'declined';
    await request.save();

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending friend requests
const getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user.id, status: 'pending' })
      .populate('sender', 'name username profilePic');
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get sent pending requests
const getSentRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ sender: req.user.id, status: 'pending' })
      .populate('receiver', 'name username profilePic');
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove friend
const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
    
    // Also remove the friend request record completely to allow future requests
    await FriendRequest.findOneAndDelete({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('friend_list_updated');
      io.to(`user_${friendId}`).emit('friend_list_updated');
    }

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Friends List
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'name username profilePic status');
    res.json(user.friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getPendingRequests,
  getSentRequests,
  removeFriend,
  getFriends
};
