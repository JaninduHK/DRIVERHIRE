import express from 'express';
import { authenticate, authorizeRoles, ensureApprovedDriver } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../models/User.js';
import {
  createBrief,
  listTravelerBriefs,
  listOpenBriefs,
  respondToBrief,
} from '../controllers/briefController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorizeRoles(USER_ROLES.GUEST), createBrief);
router.get('/mine', authorizeRoles(USER_ROLES.GUEST), listTravelerBriefs);
router.get('/', ensureApprovedDriver, listOpenBriefs);
router.post('/:briefId/respond', ensureApprovedDriver, respondToBrief);

export default router;
