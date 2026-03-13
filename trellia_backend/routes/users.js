const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Access system roster
router.get('/', userController.getTeamRoster);

module.exports = router;
