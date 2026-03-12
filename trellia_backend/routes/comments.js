const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get comments for a card
router.get('/card/:cardId', async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { cardId: req.params.cardId },
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment to a card
router.post('/', async (req, res) => {
  try {
    const { text, cardId, userId } = req.body;
    const comment = await prisma.comment.create({
      data: { text, cardId, userId: userId || null },
      include: { user: true }
    });

    // Log activity
    const card = await prisma.card.findUnique({ where: { id: cardId }, include: { list: { include: { board: true } } } });
    if (card) {
      await prisma.activity.create({
        data: {
          text: `added a comment: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          cardId,
          boardId: card.list?.board?.id,
          userId: userId || null
        }
      }).catch(() => {}); // don't fail if activity log fails
    }

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment
router.delete('/:id', async (req, res) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
