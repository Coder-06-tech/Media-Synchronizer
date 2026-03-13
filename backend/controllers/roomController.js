const VideoRoom = require('../models/VideoRoom');
const { v4: uuidv4 } = require('uuid');

const createRoom = async (req, res) => {
  try {
    const roomId = uuidv4();
    
    const room = await VideoRoom.create({
      roomId,
      broadcaster: req.user.id,
      participants: [req.user.id]
    });

    res.status(201).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRoom = async (req, res) => {
  try {
    const room = await VideoRoom.findOne({ roomId: req.params.roomId })
      .populate('broadcaster', 'name username profilePic')
      .populate('participants', 'name username profilePic');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const joinRoom = async (req, res) => {
  try {
    const room = await VideoRoom.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.participants.includes(req.user.id)) {
      room.participants.push(req.user.id);
      await room.save();
    }

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const leaveRoom = async (req, res) => {
  try {
    const room = await VideoRoom.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.participants = room.participants.filter(id => id.toString() !== req.user.id);
    
    // If broadcaster leaves, ideally end room or assign new broadcaster. 
    // For now, let's keep it simple.
    
    await room.save();
    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const inviteToRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { friendIds } = req.body;
    const Notification = require('../models/Notification');

    if (!friendIds || !Array.isArray(friendIds)) {
      return res.status(400).json({ message: 'Missing friendIds' });
    }

    const notifications = friendIds.map(friendId => ({
      userId: friendId,
      type: 'watch_invite',
      message: `${req.user.name} invited you to a watch party!`,
      relatedUser: req.user.id,
      relatedRoomId: roomId
    }));

    const savedNotifications = await Notification.insertMany(notifications);

    const io = req.app.get('io');
    if (io) {
      savedNotifications.forEach(notif => {
        io.to(`user_${notif.userId}`).emit('new_notification', {
          _id: notif._id,
          userId: notif.userId,
          type: notif.type,
          message: notif.message,
          relatedUser: notif.relatedUser,
          relatedRoomId: notif.relatedRoomId,
          read: false,
          createdAt: notif.createdAt || new Date()
        });
      });
    }

    res.json({ message: 'Invites sent scanned and confirmed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  inviteToRoom
};
