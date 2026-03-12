const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create checklist
router.post('/', async (req, res) => {
  try {
    const { title, cardId } = req.body;
    const checklist = await prisma.checklist.create({
      data: { title: title || "Checklist", cardId }
    });
    res.status(201).json(checklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.checklist.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create item
router.post('/:id/items', async (req, res) => {
  try {
    const { title } = req.body;
    const item = await prisma.checklistItem.create({
      data: { title, checklistId: req.params.id }
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update item (e.g. toggle complete)
router.put('/items/:itemId', async (req, res) => {
  try {
    const { isCompleted, title } = req.body;
    const updateData = {};
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (title !== undefined) updateData.title = title;

    const item = await prisma.checklistItem.update({
      where: { id: req.params.itemId },
      data: updateData
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete item
router.delete('/items/:itemId', async (req, res) => {
  try {
    await prisma.checklistItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
