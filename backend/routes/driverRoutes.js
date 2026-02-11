import express from 'express';
import { body, param } from 'express-validator';
import { authenticate, ensureApprovedDriver } from '../middleware/authMiddleware.js';
import { vehicleImageUpload, commissionSlipUpload } from '../middleware/cloudinaryUpload.js';
import {
  getDriverOverview,
  getDriverVehicles,
  createDriverVehicle,
  updateDriverVehicle,
  getVehicleAvailability,
  createVehicleAvailability,
  updateVehicleAvailability,
  deleteVehicleAvailability,
  completeDriverProfileTour,
} from '../controllers/driverController.js';
import {
  getDriverEarningsHistory,
  getDriverEarningsSummary,
  uploadCommissionPaymentSlip,
} from '../controllers/driverEarningsController.js';
import { VEHICLE_AVAILABILITY_STATUS } from '../models/Vehicle.js';

const router = express.Router();

router.use(authenticate);
router.use(ensureApprovedDriver);

router.get('/overview', getDriverOverview);
router.post('/onboarding/profile-tour/complete', completeDriverProfileTour);
router.get('/vehicles', getDriverVehicles);
router.post(
  '/vehicles',
  vehicleImageUpload.array('images', 5),
  [
    body('model').trim().notEmpty().withMessage('Vehicle model is required'),
    body('year')
      .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
      .withMessage('Enter a valid year')
      .toInt(),
    body('description').optional().isString().trim(),
    body('pricePerDay')
      .isFloat({ min: 35, max: 250 })
      .withMessage('Price per day must be between $35 and $250 USD')
      .toFloat(),
    body('seats').optional().isInt({ min: 1 }).withMessage('Seats must be at least 1').toInt(),
    body('englishSpeakingDriver').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('meetAndGreetAtAirport').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('fuelAndInsurance').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('driverMealsAndAccommodation').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('parkingFeesAndTolls').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('allTaxes').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
  ],
  createDriverVehicle
);

router.patch(
  '/vehicles/:id',
  vehicleImageUpload.array('images', 5),
  [
    param('id').isMongoId().withMessage('Invalid vehicle identifier'),
    body('model').trim().notEmpty().withMessage('Vehicle model is required'),
    body('year')
      .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
      .withMessage('Enter a valid year')
      .toInt(),
    body('description').optional().isString().trim(),
    body('pricePerDay')
      .isFloat({ min: 35, max: 250 })
      .withMessage('Price per day must be between $35 and $250 USD')
      .toFloat(),
    body('seats').optional().isInt({ min: 1 }).withMessage('Seats must be at least 1').toInt(),
    body('englishSpeakingDriver').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('meetAndGreetAtAirport').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('fuelAndInsurance').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('driverMealsAndAccommodation').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('parkingFeesAndTolls').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
    body('allTaxes').optional().trim().custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      return ['true', '1', 'yes', 'on'].includes(normalized) || value === false || value === 0 || value === '';
    }),
  ],
  updateDriverVehicle
);

router.get(
  '/vehicles/:id/availability',
  [param('id').isMongoId().withMessage('Invalid vehicle identifier')],
  getVehicleAvailability
);

router.post(
  '/vehicles/:id/availability',
  [
    param('id').isMongoId().withMessage('Invalid vehicle identifier'),
    body('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    body('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    body('status')
      .optional()
      .isIn(Object.values(VEHICLE_AVAILABILITY_STATUS))
      .withMessage(
        `Status must be one of: ${Object.values(VEHICLE_AVAILABILITY_STATUS).join(', ')}`
      ),
    body('note').optional().isString().trim().isLength({ max: 500 }),
  ],
  createVehicleAvailability
);

router.patch(
  '/vehicles/:id/availability/:availabilityId',
  [
    param('id').isMongoId().withMessage('Invalid vehicle identifier'),
    param('availabilityId').isMongoId().withMessage('Invalid availability identifier'),
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    body('status')
      .optional()
      .isIn(Object.values(VEHICLE_AVAILABILITY_STATUS))
      .withMessage(
        `Status must be one of: ${Object.values(VEHICLE_AVAILABILITY_STATUS).join(', ')}`
      ),
    body('note').optional().isString().trim().isLength({ max: 500 }),
  ],
  updateVehicleAvailability
);

router.delete(
  '/vehicles/:id/availability/:availabilityId',
  [
    param('id').isMongoId().withMessage('Invalid vehicle identifier'),
    param('availabilityId').isMongoId().withMessage('Invalid availability identifier'),
  ],
  deleteVehicleAvailability
);

router.get('/earnings/summary', getDriverEarningsSummary);
router.get('/earnings/history', getDriverEarningsHistory);
router.post(
  '/earnings/:commissionId/payment-slip',
  [param('commissionId').isMongoId().withMessage('Invalid commission reference')],
  commissionSlipUpload.single('slip'),
  uploadCommissionPaymentSlip
);

export default router;
