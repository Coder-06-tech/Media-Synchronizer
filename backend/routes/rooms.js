const express = require('express');
const router = express.Router();
const { 
  createRoom, 
  getRoom,
  joinRoom,
  leaveRoom,
  inviteToRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createRoom);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', joinRoom);
router.post('/:roomId/leave', leaveRoom);
router.post('/:roomId/invite', inviteToRoom);

module.exports = router;
