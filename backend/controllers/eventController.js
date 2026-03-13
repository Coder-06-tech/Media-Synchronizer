const mongoose = require('mongoose');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

const createEvent = async (req, res) => {
  try {
    const { title, invitedFriends, date, time, linkedWatchRoom } = req.body;

    const event = await Event.create({
      title,
      host: req.user.id,
      invitedFriends,
      responses: invitedFriends.map(fId => ({ user: fId, status: 'pending' })),
      date,
      time,
      linkedWatchRoom
    });

    // Notify invited friends
    const notifications = invitedFriends.map(friendId => ({
      userId: friendId,
      type: 'event_invite',
      message: `${req.user.name} invited you to an event: ${title}`,
      relatedEvent: event._id
    }));

    await Notification.insertMany(notifications);

    // Emit socket events for each invite
    const io = req.app.get('io');
    if (io) {
      notifications.forEach((notif, index) => {
        io.to(`user_${notif.userId}`).emit('new_notification', {
          ...notif,
          _id: new mongoose.Types.ObjectId(), // Temporary ID for immediate UI feedback if needed
          createdAt: new Date()
        });
      });
    }

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEvents = async (req, res) => {
  try {
    // Get events where user is host OR invited
    const events = await Event.find({
      $or: [
        { host: req.user.id },
        { invitedFriends: req.user.id }
      ]
    })
    .populate('host', 'name username profilePic')
    .sort({ date: 1, time: 1 });

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('host', 'name username profilePic')
      .populate('invitedFriends', 'name username profilePic');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const respondToInvite = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body; // 'accepted' or 'declined'
    
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const response = event.responses.find(r => r.user.toString() === req.user.id);
    if (!response) return res.status(403).json({ message: 'Not invited' });

    response.status = status;
    await event.save();

    // Mark corresponding notification as read
    await Notification.updateMany(
      { userId: req.user.id, relatedEvent: eventId, type: 'event_invite' },
      { read: true }
    );

    res.json({ message: `Invite ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  respondToInvite
};
