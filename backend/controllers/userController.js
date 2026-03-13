const User = require('../models/User');

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
        // Exclude current user and their existing friends
        const currentUser = await User.findById(req.user.id);
        const excludeIds = [req.user.id, ...currentUser.friends];
        
        const users = await User.find({ _id: { $nin: excludeIds } })
            .select('name username profilePic dob friends')
            .limit(50);
            
        // Calculate mutual friends
        const usersWithMutuals = users.map(u => {
            const mutualCount = u.friends.filter(fId => 
                currentUser.friends.includes(fId)
            ).length;
            
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
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  searchUsers,
  getPotentialFriends
};
