const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all boards
router.get('/', async (req, res) => {
  try {
    const boards = await prisma.board.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific board with lists, cards, labels, members, checklists, comments, attachments
router.get('/:id', async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: req.params.id },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                labels: true,
                members: true,
                checklists: {
                  include: { items: { orderBy: { createdAt: 'asc' } } }
                },
                comments: {
                  include: { user: true },
                  orderBy: { createdAt: 'asc' }
                },
                attachments: {
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          }
        }
      }
    });

    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new board
router.post('/', async (req, res) => {
  try {
    const { title, color } = req.body;
    const board = await prisma.board.create({
      data: { title, color }
    });
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update board (title, color, background)
router.put('/:id', async (req, res) => {
  try {
    const { title, color, backgroundUrl } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (color !== undefined) updateData.color = color;
    if (backgroundUrl !== undefined) updateData.backgroundUrl = backgroundUrl;

    const board = await prisma.board.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
