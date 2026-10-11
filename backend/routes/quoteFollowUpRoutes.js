import express from 'express';
import {
  showQuoteAnswer,
  saveQuoteAnswer,
  showQuoteRepost,
  saveQuoteRepost,
} from '../controllers/quoteFollowUpController.js';

const router = express.Router();

// Public, token-authenticated pages opened from quote follow-up emails. Mounted
// on its own path (never inside briefRoutes.js, which applies
// `router.use(authenticate)`) so it can never inherit or bypass that guard.
// GET shows the page; only the POST behind its button changes anything.
router.get('/answer/:token', showQuoteAnswer);
router.post('/answer/:token', saveQuoteAnswer);
router.get('/repost/:token', showQuoteRepost);
router.post('/repost/:token', saveQuoteRepost);

export default router;
