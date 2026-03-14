require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const allUsers = await User.find();
    console.log('--- POTENTIAL FRIENDS AUDIT ---');
    for (const user of allUsers) {
        const friendIds = (user.friends || []);
        const excludeIds = [user._id, ...friendIds];
        const potential = await User.find({ _id: { $nin: excludeIds } });
        console.log(`User: ${user.username.padEnd(20)} | Potential count: ${potential.length}`);
    }
    await mongoose.disconnect();
}

test();
