const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');

// Define new list entry
router.post('/', listController.createNewList);

// Rename list header
router.put('/:listId', listController.renameList);

// Bulk list re-positioning
router.put('/reorder/all', listController.reorderLists);

// Terminate list and contents
router.delete('/:listId', listController.deleteList);

module.exports = router;
