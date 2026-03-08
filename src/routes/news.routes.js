const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const NewsController = require('../controllers/news.controller');

const router = express.Router();

router.get('/', authenticate, NewsController.getNews);

module.exports = router;