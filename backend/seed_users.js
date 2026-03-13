require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const seedUsers = [
  {
    name: "Dustin Henderson",
    username: "dusty84",
    password: "password123",
    phone: "555-0101",
    dob: new Date("1971-05-22"),
    email: "dustin@hawkins.com"
  },
  {
    name: "Lucas Sinclair",
    username: "stalker",
    password: "password123",
    phone: "555-0102",
    dob: new Date("1971-01-19"),
    email: "lucas@hawkins.com"
  },
  {
    name: "Mike Wheeler",
    username: "dungeonmaster",
    password: "password123",
    phone: "555-0103",
    dob: new Date("1971-04-07"),
    email: "mike@hawkins.com"
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cerebro-code-red');
    console.log("Connected to MongoDB for seeding...");

    // Clear existing mock users to avoid unique constraint errors
    const usernames = seedUsers.map(u => u.username);
    await User.deleteMany({ username: { $in: usernames } });
    console.log("Cleared existing mock users (if any).");

    for (const u of seedUsers) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const user = new User({
        name: u.name,
        username: u.username,
        passwordHash: passwordHash,
        phone: u.phone,
        dob: u.dob,
        email: u.email,
        hasSelectedInitialFriends: true
      });
      await user.save();
      console.log(`User ${u.username} seeded successfully.`);
    }

    console.log("Seeding complete successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:");
    console.error(error);
    process.exit(1);
  }
};

seedDB();
