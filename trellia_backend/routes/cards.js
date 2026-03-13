const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

// Initialize new task card
router.post('/', cardController.generateCard);

// Modify card properties
router.put('/:cardId', cardController.modifyCard);

// Batch update task coordinates
router.put('/reorder/all', cardController.syncCardPositions);

// Archive/Delete task
router.delete('/:cardId', cardController.archiveCard);

module.exports = router;
