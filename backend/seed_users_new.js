const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing just in case (though it's empty)
        await User.deleteMany({});
        
        const passwordHash = await bcrypt.hash('123456', 10);

        const users = [
            {
                name: 'Mike Wheeler',
                username: 'paladin_mike',
                dob: new Date('1971-04-07'),
                phone: '555-0101',
                email: 'mike@hawkins.gov',
                passwordHash,
                profilePic: 'https://ui-avatars.com/api/?name=Mike+Wheeler&background=a00&color=fff',
            },
            {
                name: 'Eleven',
                username: 'el_hopper',
                dob: new Date('1971-06-15'),
                phone: '555-0102',
                email: 'el@hawkins.gov',
                passwordHash,
                profilePic: 'https://ui-avatars.com/api/?name=Eleven&background=00a&color=fff',
            },
            {
                name: 'Dustin Henderson',
                username: 'bard_dustin',
                dob: new Date('1971-05-30'),
                phone: '555-0103',
                email: 'dustin@hawkins.gov',
                passwordHash,
                profilePic: 'https://ui-avatars.com/api/?name=Dustin+Henderson&background=0a0&color=fff',
            },
            {
                name: 'Lucas Sinclair',
                username: 'ranger_lucas',
                dob: new Date('1971-08-14'),
                phone: '555-0104',
                email: 'lucas@hawkins.gov',
                passwordHash,
                profilePic: 'https://ui-avatars.com/api/?name=Lucas+Sinclair&background=aa0&color=fff',
            },
            {
                name: 'Will Byers',
                username: 'cleric_will',
                dob: new Date('1971-03-22'),
                phone: '555-0105',
                email: 'will@hawkins.gov',
                passwordHash,
                profilePic: 'https://ui-avatars.com/api/?name=Will+Byers&background=a0a&color=fff',
            }
        ];

        await User.insertMany(users);
        console.log('Successfully seeded 5 users into the database!');
        
        process.exit(0);
    } catch (err) {
        console.error('Error seeding users:', err);
        process.exit(1);
    }
};

seedUsers();
