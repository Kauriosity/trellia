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

// Get a specific board with lists, cards, and labels
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
                  include: { items: true }
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

module.exports = router;
