import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  getDriverApplications,
  updateDriverStatus,
  getVehicleSubmissions,
  updateVehicleStatus,
  updateVehicleDetails,
  listBookings,
  updateBooking,
  deleteBooking,
  listBriefs,
  updateBrief,
  deleteBrief,
  listOffers,
  updateOfferStatus,
  deleteOffer,
  listConversations,
  updateConversationStatus,
  deleteConversation,
} from '../controllers/adminController.js';
import {
  listAdminReviews,
  updateReviewStatus as updateReviewStatusController,
} from '../controllers/reviewController.js';
import { DRIVER_STATUS, USER_ROLES } from '../models/User.js';
import { VEHICLE_STATUS } from '../models/Vehicle.js';
import { REVIEW_STATUS } from '../models/Review.js';
import { BOOKING_STATUS } from '../models/Booking.js';
import {
  listCommissionDiscounts,
  createCommissionDiscount,
  updateCommissionDiscount,
  deleteCommissionDiscount,
} from '../controllers/commissionDiscountController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles(USER_ROLES.ADMIN));

router.get('/drivers', getDriverApplications);

router.patch(
  '/drivers/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid driver identifier'),
    body('status')
      .isIn(Object.values(DRIVER_STATUS))
      .withMessage(`Status must be one of: ${Object.values(DRIVER_STATUS).join(', ')}`),
  ],
  updateDriverStatus
);

router.get('/vehicles', getVehicleSubmissions);

router.patch(
  '/vehicles/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid vehicle identifier'),
    body('status')
      .isIn(Object.values(VEHICLE_STATUS))
      .withMessage(`Status must be one of: ${Object.values(VEHICLE_STATUS).join(', ')}`),
    body('rejectedReason').optional().isString().trim().isLength({ max: 500 }),
  ],
  updateVehicleStatus
);

router.patch(
  '/vehicles/:id',
  [
    param('id').isMongoId().withMessage('Invalid vehicle identifier'),
    body('model').trim().notEmpty().withMessage('Vehicle model is required'),
    body('year')
      .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
      .withMessage('Enter a valid year')
      .toInt(),
    body('description').optional().isString().trim(),
    body('pricePerDay')
      .isFloat({ min: 0 })
      .withMessage('Price per day must be a positive number')
      .toFloat(),
    body('seats').optional().isInt({ min: 1 }).withMessage('Seats must be at least 1').toInt(),
    body('englishSpeakingDriver').isBoolean().toBoolean(),
    body('meetAndGreetAtAirport').isBoolean().toBoolean(),
    body('fuelAndInsurance').isBoolean().toBoolean(),
    body('driverMealsAndAccommodation').isBoolean().toBoolean(),
    body('parkingFeesAndTolls').isBoolean().toBoolean(),
    body('allTaxes').isBoolean().toBoolean(),
  ],
  updateVehicleDetails
);

router.get('/reviews', listAdminReviews);

router.patch(
  '/reviews/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid review identifier'),
    body('status')
      .isIn(Object.values(REVIEW_STATUS))
      .withMessage(`Status must be one of: ${Object.values(REVIEW_STATUS).join(', ')}`),
    body('adminNote').optional().isString().trim().isLength({ max: 500 }),
  ],
  updateReviewStatusController
);

router.get('/bookings', listBookings);

router.patch(
  '/bookings/:id',
  [
    param('id').isMongoId().withMessage('Invalid booking identifier'),
    body('status')
      .optional()
      .isIn(Object.values(BOOKING_STATUS))
      .withMessage(`Status must be one of: ${Object.values(BOOKING_STATUS).join(', ')}`),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    body('pricePerDay')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price per day must be a positive number'),
    body('totalPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Total price must be a positive number'),
    body('paymentNote').optional().isString().trim().isLength({ max: 500 }),
    body('startPoint').optional().isString().trim().isLength({ max: 200 }),
    body('endPoint').optional().isString().trim().isLength({ max: 200 }),
    body('specialRequests').optional().isString().trim().isLength({ max: 1000 }),
    body('flightNumber').optional().isString().trim().isLength({ max: 40 }),
    body('arrivalTime').optional().isString().trim().isLength({ max: 80 }),
    body('departureTime').optional().isString().trim().isLength({ max: 80 }),
  ],
  updateBooking
);

router.delete(
  '/bookings/:id',
  [param('id').isMongoId().withMessage('Invalid booking identifier')],
  deleteBooking
);

router.get('/briefs', listBriefs);

router.patch(
  '/briefs/:id',
  [
    param('id').isMongoId().withMessage('Invalid brief identifier'),
    body('status').optional().isIn(['open', 'closed']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('startLocation').optional().isString().trim().isLength({ max: 200 }),
    body('endLocation').optional().isString().trim().isLength({ max: 200 }),
    body('message').optional().isString().trim().isLength({ min: 1, max: 2000 }),
    body('country').optional().isString().trim().isLength({ min: 1, max: 120 }),
  ],
  updateBrief
);

router.delete(
  '/briefs/:id',
  [param('id').isMongoId().withMessage('Invalid brief identifier')],
  deleteBrief
);

router.get('/offers', listOffers);

router.patch(
  '/offers/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid offer identifier'),
    body('status')
      .isIn(['pending', 'accepted', 'declined'])
      .withMessage('Status must be pending, accepted, or declined'),
  ],
  updateOfferStatus
);

router.delete(
  '/offers/:id',
  [param('id').isMongoId().withMessage('Invalid offer identifier')],
  deleteOffer
);

router.get('/conversations', listConversations);

router.patch(
  '/conversations/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid conversation identifier'),
    body('status')
      .isIn(['active', 'closed'])
      .withMessage('Status must be active or closed'),
  ],
  updateConversationStatus
);

router.delete(
  '/conversations/:id',
  [param('id').isMongoId().withMessage('Invalid conversation identifier')],
  deleteConversation
);

router.get('/discounts', listCommissionDiscounts);

router.post(
  '/discounts',
  [
    body('name').trim().notEmpty().withMessage('Discount name is required').isLength({ max: 160 }),
    body('description').optional().isString().trim().isLength({ max: 1000 }),
    body('discountPercent')
      .isFloat({ min: 0, max: 8 })
      .withMessage('Discount must be between 0% and 8%')
      .toFloat(),
    body('startDate').isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').isISO8601().withMessage('End date must be a valid ISO date'),
    body('active').optional().isBoolean().toBoolean(),
  ],
  createCommissionDiscount
);

router.patch(
  '/discounts/:id',
  [
    param('id').isMongoId().withMessage('Invalid discount identifier'),
    body('name').optional().isString().trim().notEmpty().isLength({ max: 160 }),
    body('description').optional().isString().trim().isLength({ max: 1000 }),
    body('discountPercent')
      .optional()
      .isFloat({ min: 0, max: 8 })
      .withMessage('Discount must be between 0% and 8%')
      .toFloat(),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    body('active').optional().isBoolean().toBoolean(),
  ],
  updateCommissionDiscount
);

router.delete(
  '/discounts/:id',
  [param('id').isMongoId().withMessage('Invalid discount identifier')],
  deleteCommissionDiscount
);

export default router;
