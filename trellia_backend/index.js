const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const boardsRouter = require('./routes/boards');
const listsRouter = require('./routes/lists');
const cardsRouter = require('./routes/cards');
const usersRouter = require('./routes/users');
const checklistsRouter = require('./routes/checklists');
const commentsRouter = require('./routes/comments');
const attachmentsRouter = require('./routes/attachments');
const activityRouter = require('./routes/activity');

app.use('/api/boards', boardsRouter);
app.use('/api/lists', listsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/users', usersRouter);
app.use('/api/checklists', checklistsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/activity', activityRouter);

const errorHandler = require('./middleware/errorHandler');

app.get('/api/labels', async (req, res) => {
  try {
    const labels = await prisma.label.findMany();
    res.json(labels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Trellia Backend is running' });
});

// Final error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
