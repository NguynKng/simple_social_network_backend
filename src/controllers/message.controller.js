const MessageService = require("../services/message.service");

const messageService = new MessageService();

class MessageController {
	static async sendMessage(req, res, next) {
		try {
			const senderId = req.user?.id || req.user?.userId;
			const files = Array.isArray(req.files) ? req.files : [];
			const result = await messageService.sendMessage(senderId, req.body || {}, files);
			res.status(201).json(result);
		} catch (error) {
			next(error);
		}
	}

	static async getHistoryChat(req, res, next) {
		try {
			const currentUserId = req.user?.id || req.user?.userId;
			const { chatId } = req.params;
			const { page = 1, limit = 20 } = req.query;

			const result = await messageService.getHistoryChat(currentUserId, chatId, {
				page: Number(page) || 1,
				limit: Number(limit) || 20,
			});

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	}
}

module.exports = MessageController;
