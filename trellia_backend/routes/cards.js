const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new card
router.post('/', async (req, res) => {
  try {
    const { title, listId, position } = req.body;
    const card = await prisma.card.create({
      data: { title, listId, position }
    });
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a card
router.put('/:id', async (req, res) => {
  try {
    const { title, description, dueDate, listId, position, labelIds, memberIds } = req.body;
    
    // Prepare data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (listId !== undefined) updateData.listId = listId;
    if (position !== undefined) updateData.position = position;
    
    // Handle labels
    if (labelIds !== undefined) {
      updateData.labels = {
        set: labelIds.map(id => ({ id }))
      };
    }
    
    // Handle members
    if (memberIds !== undefined) {
      updateData.members = {
        set: memberIds.map(id => ({ id }))
      };
    }

    const card = await prisma.card.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        labels: true,
        members: true
      }
    });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder/move cards
router.put('/reorder/all', async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, position, listId }
    
    const transactions = items.map(item => {
      const data = { position: item.position };
      if (item.listId) data.listId = item.listId;
      
      return prisma.card.update({
        where: { id: item.id },
        data
      });
    });
    
    await prisma.$transaction(transactions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a card
router.delete('/:id', async (req, res) => {
  try {
    await prisma.card.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
