const express = require('express');
const router = express.Router();
const { 
  createEvent, 
  getEvents,
  getEvent,
  respondToInvite
} = require('../controllers/eventController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createEvent);
router.get('/', getEvents);
router.get('/:id', getEvent);
router.put('/:eventId/respond', respondToInvite);

module.exports = router;
