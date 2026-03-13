const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');

// Retrieve all boards
router.get('/', boardController.getAllBoards);

// Get specific board details by unique identifier
router.get('/:boardId', boardController.getBoardById);

// Create a new board instance
router.post('/', boardController.createBoard);

// Update board configuration and metadata
router.put('/:boardId', boardController.updateBoardSettings);

module.exports = router;
