const express = require('express');
const router = express.Router();
const { 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest,
    getPendingRequests,
    getSentRequests,
    removeFriend,
    getFriends,
    getFriendStatus
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getFriends);
router.get('/status/:userId', getFriendStatus);
router.post('/request', sendFriendRequest);
router.get('/requests/pending', getPendingRequests);
router.get('/requests/sent', getSentRequests);
router.put('/request/:requestId/accept', acceptFriendRequest);
router.put('/request/:requestId/decline', declineFriendRequest);
router.delete('/:friendId', removeFriend);

module.exports = router;
