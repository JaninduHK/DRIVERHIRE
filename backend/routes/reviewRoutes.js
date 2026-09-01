import express from 'express';
import {
  listLatestReviews,
  getReviewInvite,
  createReviewFromToken,
} from '../controllers/reviewController.js';

const router = express.Router();

// Public: latest approved reviews across all vehicles (homepage carousel).
router.get('/latest', listLatestReviews);

// Public, token-authenticated: opened straight from the post-trip review email so
// the traveller does not have to sign in. See reviewController for why.
router.get('/invite/:token', getReviewInvite);
router.post('/invite/:token', createReviewFromToken);

export default router;
