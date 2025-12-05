import express from 'express';
import { body } from 'express-validator';
import {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  getCurrentUser,
  updateProfile,
  updatePassword,
  requestPasswordReset,
  resetPassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../models/User.js';

const router = express.Router();

const passwordRules = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/[a-z]/)
  .withMessage('Password must include a lowercase letter')
  .matches(/[A-Z]/)
  .withMessage('Password must include an uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must include a number');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    passwordRules,
    body('role')
      .optional()
      .isIn(Object.values(USER_ROLES))
      .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),
    body('adminCode').optional().isString(),
  ],
  registerUser
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  loginUser
);

router.get('/verify-email', verifyEmail);

router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('Valid email is required')],
  resendVerificationEmail
);

router.post(
  '/password/reset/request',
  [body('email').isEmail().withMessage('Valid email is required')],
  requestPasswordReset
);

router.post(
  '/password/reset/confirm',
  [body('token').isString().notEmpty().withMessage('Reset token is required'), passwordRules],
  resetPassword
);

router.get('/me', authenticate, getCurrentUser);

router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 120 }).withMessage('Name cannot be empty'),
    body('contactNumber').optional().isString().trim().isLength({ max: 40 }),
    body('description').optional().isString().trim().isLength({ max: 1000 }),
    body('tripAdvisor').optional().isString().trim().isLength({ max: 200 }),
    body('address').optional().isString().trim().isLength({ max: 200 }),
  ],
  updateProfile
);

router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    passwordRules,
  ],
  updatePassword
);

export default router;
