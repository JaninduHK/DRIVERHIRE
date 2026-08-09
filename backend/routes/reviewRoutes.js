import express from 'express';
import { listLatestReviews } from '../controllers/reviewController.js';

const router = express.Router();

// Public: latest approved reviews across all vehicles (homepage carousel).
router.get('/latest', listLatestReviews);

export default router;
