const express = require('express');
const UserController = require('../controllers/user.controller');

const router = express.Router();

/**
 * User routes — Base: /api/:version/users
 */
router.get('/:id', UserController.getUserById);

module.exports = router;
