import express from 'express';
import { createChat, getChats, getChat, sendMessage, updateChat, deleteChat, analyzeReport } from '../controllers/chatController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Chat routes
router.post('/', createChat);
router.get('/', getChats);
router.get('/:chatId', getChat);
router.put('/:chatId', updateChat);
router.post('/:chatId/messages', sendMessage);
router.delete('/:chatId', deleteChat);

// Report analysis route
router.post('/analyze-report/:reportId', analyzeReport);

export default router;
