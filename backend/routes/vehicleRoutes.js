import express from 'express';
import {
  listVehicles,
  getVehicleDetails,
  checkVehicleAvailability,
  createVehicleBooking,
} from '../controllers/vehicleController.js';
import { listVehicleReviews } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', listVehicles);
router.post('/:id/check-availability', checkVehicleAvailability);
router.post('/:id/bookings', authenticate, createVehicleBooking);
router.get('/:id/reviews', listVehicleReviews);
router.get('/:id', getVehicleDetails);

export default router;
