require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cerebro-code-red');
    const user = await User.findOne({ username: 'stalker' });
    if (user) {
      console.log('User found:', JSON.stringify(user, null, 2));
    } else {
      console.log('User not found');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkUser();
