const express = require('express');
const router = express.Router();
const { 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest,
    getPendingRequests,
    getSentRequests,
    removeFriend,
    getFriends
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getFriends);
router.post('/request', sendFriendRequest);
router.get('/requests/pending', getPendingRequests);
router.get('/requests/sent', getSentRequests);
router.put('/request/:requestId/accept', acceptFriendRequest);
router.put('/request/:requestId/decline', declineFriendRequest);
router.delete('/:friendId', removeFriend);

module.exports = router;
