const Event = require('../models/Event');
const Notification = require('../models/Notification');

const createEvent = async (req, res) => {
  try {
    const { title, invitedFriends, date, time, linkedWatchRoom } = req.body;

    const event = await Event.create({
      title,
      host: req.user.id,
      invitedFriends,
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

module.exports = {
  createEvent,
  getEvents,
  getEvent
};
