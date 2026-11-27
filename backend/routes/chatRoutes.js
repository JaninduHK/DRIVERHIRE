import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  startConversation,
  listConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  sendOffer,
  fetchOffer,
  declineOffer,
} from '../controllers/chatController.js';

const router = express.Router();

router.use(authenticate);

router.post('/conversations', startConversation);
router.get('/conversations', listConversations);
router.get('/conversations/:conversationId/messages', fetchMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.post('/conversations/:conversationId/offers', sendOffer);
router.post('/conversations/:conversationId/read', markConversationRead);
router.get('/offers/:offerId', fetchOffer);
router.post('/offers/:offerId/decline', declineOffer);

export default router;
