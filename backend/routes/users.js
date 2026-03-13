const express = require('express');
const router = express.Router();
const { 
    getUserProfile, 
    updateUserProfile, 
    searchUsers,
    getPotentialFriends,
    recordProfileView
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.single('profilePic'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

router.get('/search', protect, searchUsers);
router.get('/potential', protect, getPotentialFriends);
router.route('/profile')
    .put(protect, updateUserProfile);
router.get('/:id', protect, getUserProfile);
router.post('/:id/view', protect, recordProfileView);

module.exports = router;
