const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images, PDFs, Office docs, text
  const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|xls|xlsx|csv/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Get attachments for a card
router.get('/card/:cardId', async (req, res) => {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { cardId: req.params.cardId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(attachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add URL-based attachment
router.post('/url', async (req, res) => {
  try {
    const { name, url, cardId } = req.body;
    if (!url || !cardId) return res.status(400).json({ error: 'url and cardId required' });
    const attachment = await prisma.attachment.create({
      data: { name: name || url, url, cardId }
    });
    res.status(201).json(attachment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload a file attachment
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { cardId } = req.body;
    if (!cardId) return res.status(400).json({ error: 'cardId required' });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const attachment = await prisma.attachment.create({
      data: {
        name: req.file.originalname,
        url: fileUrl,
        cardId
      }
    });
    res.status(201).json(attachment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload card cover image
router.post('/cover/:cardId', upload.single('cover'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const coverUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data: { coverUrl, coverColor: null }
    });
    res.json({ coverUrl, card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete attachment
router.delete('/:id', async (req, res) => {
  try {
    const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (att) {
      // Try to delete local file if it was uploaded
      if (att.url && att.url.includes('/uploads/')) {
        const filename = att.url.split('/uploads/').pop();
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await prisma.attachment.delete({ where: { id: req.params.id } });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
