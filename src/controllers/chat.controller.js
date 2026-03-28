const ChatService = require("../services/chat.service");

const chatService = new ChatService();

class ChatController {
	static async getChatByUserId(req, res, next) {
		try {
			const currentUserId = req.user?.id || req.user?.userId;
			const targetUserId = req.params.userId;
			const result = await chatService.getChatByUserId(currentUserId, targetUserId);
			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	}

	static async getRecentChat(req, res, next) {
		try {
			const currentUserId = req.user?.id || req.user?.userId;
			const { page = 1, limit = 20 } = req.query;

			const result = await chatService.getRecentChat(currentUserId, {
				page: Number(page) || 1,
				limit: Number(limit) || 20,
			});

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = ChatController;
