const User = require('../models/User');
const Notification = require('../models/Notification');

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('friends', 'name username profilePic');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only allow updating certain fields
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.email = req.body.email || user.email;
    user.profilePic = req.body.profilePic || user.profilePic;

    if (req.body.hasSelectedInitialFriends !== undefined) {
      user.hasSelectedInitialFriends = req.body.hasSelectedInitialFriends;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser.id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profilePic: updatedUser.profilePic,
      hasSelectedInitialFriends: updatedUser.hasSelectedInitialFriends
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const searchUsers = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { username: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  try {
    // Return users matching keyword, exclude the current user
    const users = await User.find({ ...keyword, _id: { $ne: req.user.id } })
      .select('name username profilePic dob friends')
      .limit(20);
      
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPotentialFriends = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const currentUserId = new mongoose.Types.ObjectId(req.user.id);
        const currentUser = await User.findById(currentUserId).select('friends').lean();
        
        // Build the exclusion list — current user + existing friends
        const friendIds = (currentUser?.friends || []);
        const excludeIds = [currentUserId, ...friendIds];
        
        const users = await User.find({ _id: { $nin: excludeIds } })
            .select('name username profilePic dob friends')
            .limit(50)
            .lean();

        // Calculate mutual friends
        const friendIdStrings = friendIds.map(id => id.toString());
        const usersWithMutuals = users.map(u => {
            const uFriendStrings = (u.friends || []).map(id => id.toString());
            const mutualCount = uFriendStrings.filter(id => friendIdStrings.includes(id)).length;
            return {
                _id: u._id,
                name: u.name,
                username: u.username,
                profilePic: u.profilePic,
                dob: u.dob,
                mutualFriends: mutualCount
            };
        });
        
        res.json(usersWithMutuals);
    } catch (error) {
        console.error('getPotentialFriends error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const recordProfileView = async (req, res) => {
  try {
    const viewerId = req.user.id;
    const targetUserId = req.params.id;

    if (viewerId === targetUserId) {
      return res.json({ message: 'Viewing own profile' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const viewer = await User.findById(viewerId);

    // Create notification
    const notification = await Notification.create({
      userId: targetUserId,
      type: 'profile_view',
      message: `${viewer.name} viewed your profile`,
      relatedUser: viewerId
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetUserId}`).emit('new_notification', notification);
    }

    res.json({ message: 'Profile view recorded' });
  } catch (error) {
    console.error('recordProfileView error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  searchUsers,
  getPotentialFriends,
  recordProfileView
};
