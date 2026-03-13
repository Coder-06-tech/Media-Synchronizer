const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcrypt');

const registerUser = async (req, res) => {
  try {
    const { name, dob, username, password, phone, email, profilePic } = req.body;

    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      dob,
      username,
      passwordHash,
      phone,
      email,
      profilePic
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        username: user.username,
        profilePic: user.profilePic,
        hasSelectedInitialFriends: user.hasSelectedInitialFriends,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt: username='${username}'`);

    const user = await User.findOne({ username });
    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (isMatch) {
      console.log(`Password match success for ${username}`);
      res.json({
        _id: user.id,
        name: user.name,
        username: user.username,
        profilePic: user.profilePic,
        hasSelectedInitialFriends: user.hasSelectedInitialFriends,
        token: generateToken(user._id),
      });
    } else {
      console.log(`Password mismatch for ${username}`);
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error detail:', error);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
