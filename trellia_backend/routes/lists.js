const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new list
router.post('/', async (req, res) => {
  try {
    const { title, boardId, position } = req.body;
    const list = await prisma.list.create({
      data: { title, boardId, position }
    });
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a list (rename)
router.put('/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const list = await prisma.list.update({
      where: { id: req.params.id },
      data: { title }
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder lists (drag and drop)
router.put('/reorder/all', async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, position }
    
    const transactions = items.map(item => 
      prisma.list.update({
        where: { id: item.id },
        data: { position: item.position }
      })
    );
    
    await prisma.$transaction(transactions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a list
router.delete('/:id', async (req, res) => {
  try {
    await prisma.list.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'List deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
