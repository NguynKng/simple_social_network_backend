const { NEWS_API_KEY } = require("../config/envVars");

class NewsService {
  constructor() {
    this.apiKey = NEWS_API_KEY;
    this.baseUrl = `https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=${this.apiKey}`;
  }
  async getTopTechNews() {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch news");
      }
      const data = await response.json();
      return {
        status: 200,
        success: true,
        data: data.articles
      };
    } catch (error) {
      console.error("Error fetching news:", error);
      throw error;
    }
  }
}

module.exports = NewsService;
