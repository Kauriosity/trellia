const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new card
router.post('/', async (req, res) => {
  try {
    const { title, listId, position } = req.body;
    const card = await prisma.card.create({
      data: { title, listId, position },
      include: { labels: true, members: true, checklists: { include: { items: true } }, comments: { include: { user: true } }, attachments: true }
    });

    // Log activity
    const list = await prisma.list.findUnique({ where: { id: listId }, include: { board: true } });
    if (list) {
      await prisma.activity.create({
        data: { text: `added card "${title}" to list "${list.title}"`, cardId: card.id, boardId: list.board?.id }
      }).catch(() => {});
    }

    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a card
router.put('/:id', async (req, res) => {
  try {
    const { title, description, dueDate, listId, position, labelIds, memberIds, coverColor, coverUrl } = req.body;
    
    // Prepare data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (listId !== undefined) updateData.listId = listId;
    if (position !== undefined) updateData.position = position;
    if (coverColor !== undefined) updateData.coverColor = coverColor;
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl;
    
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
        members: true,
        checklists: { include: { items: true } },
        comments: { include: { user: true } },
        attachments: true
      }
    });

    // Log significant changes in activity
    try {
      const list = await prisma.list.findUnique({ where: { id: card.listId }, include: { board: true } });
      if (list) {
        if (dueDate !== undefined) {
          await prisma.activity.create({
            data: { text: dueDate ? `set due date to ${new Date(dueDate).toLocaleDateString()}` : `removed due date`, cardId: card.id, boardId: list.board?.id }
          });
        }
        if (description !== undefined) {
          await prisma.activity.create({
            data: { text: `updated the description`, cardId: card.id, boardId: list.board?.id }
          });
        }
      }
    } catch (_) {}

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
