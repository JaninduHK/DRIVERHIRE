import express from 'express';
import { listPublicDrivers, getPublicDriverDetails } from '../controllers/driverDirectoryController.js';

const router = express.Router();

router.get('/', listPublicDrivers);
router.get('/:id', getPublicDriverDetails);

export default router;
