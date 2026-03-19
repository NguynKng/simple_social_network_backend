const NewsService = require("../services/news.service");

const newsService = new NewsService();

class NewsController {
  static async getNews(req, res, next) {
    try {
      const news = await newsService.getTopTechNews();
      res.status(200).json(news);
    } catch (error) {
        next(error);
    }
  }
}

module.exports = NewsController;
