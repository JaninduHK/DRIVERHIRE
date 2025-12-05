import express from 'express';
import { authenticate, authorizeRoles, ensureApprovedDriver } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../models/User.js';
import {
  listTravelerBookings,
  listDriverBookings,
  driverRespondToBooking,
  updateTravelerBooking,
  cancelTravelerBooking,
} from '../controllers/bookingController.js';
import { createBookingReview } from '../controllers/reviewController.js';

const router = express.Router();

router.use(authenticate);

router.get('/traveler', authorizeRoles(USER_ROLES.GUEST), listTravelerBookings);
router.get('/driver', ensureApprovedDriver, listDriverBookings);
router.patch('/:id/status', ensureApprovedDriver, driverRespondToBooking);
router.patch('/:id', authorizeRoles(USER_ROLES.GUEST), updateTravelerBooking);
router.post('/:id/cancel', authorizeRoles(USER_ROLES.GUEST), cancelTravelerBooking);
router.post('/:id/reviews', authorizeRoles(USER_ROLES.GUEST), createBookingReview);

export default router;
