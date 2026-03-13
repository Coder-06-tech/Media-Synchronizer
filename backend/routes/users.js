const express = require('express');
const router = express.Router();
const { 
    getUserProfile, 
    updateUserProfile, 
    searchUsers,
    getPotentialFriends
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchUsers);
router.get('/potential', protect, getPotentialFriends);
router.route('/profile')
    .put(protect, updateUserProfile);
router.get('/:id', protect, getUserProfile);

module.exports = router;
