import express from 'express';
import { body } from 'express-validator';
import { submitSupportRequest } from '../controllers/supportController.js';

const router = express.Router();

router.post(
  '/contact',
  [
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('category').optional().isString().trim().isLength({ max: 160 }),
    body('bookingId').optional().isString().trim().isLength({ max: 120 }),
    body('message')
      .isString()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Message must be at least 10 characters.'),
  ],
  submitSupportRequest
);

export default router;
