const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('relatedUser', 'name username profilePic')
      .populate('relatedEvent', 'title date time')
      .lean();   // plain JS objects — 2-3x faster than Mongoose documents
    
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    notification.read = true;
    await notification.save();
    
    res.json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: 'Notifications cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  clearAll
};
