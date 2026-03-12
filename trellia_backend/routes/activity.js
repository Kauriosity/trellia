const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get activity for a card
router.get('/card/:cardId', async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { cardId: req.params.cardId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activity for a board
router.get('/board/:boardId', async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { boardId: req.params.boardId },
      include: { user: true, card: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
