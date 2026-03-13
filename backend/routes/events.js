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
router.patch('/:id', async (req, res) => {
    try {
        const { linkedWatchRoom } = req.body;
        const event = await require('../models/Event').findByIdAndUpdate(req.params.id, { linkedWatchRoom }, { new: true });
        res.json(event);
    } catch (e) { res.status(500).json({ message: 'Error updating event' }); }
});
router.put('/:eventId/respond', respondToInvite);

module.exports = router;
