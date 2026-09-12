import express from 'express';
import { getOfferInvite } from '../controllers/offerInviteController.js';

const router = express.Router();

// Public, token-authenticated: opened straight from the offer notification
// email so the traveller does not have to sign in. See offerInviteController
// for why. Mounted on its own path (never inside chatRoutes.js, which applies
// `router.use(authenticate)`) so it can never inherit or bypass that guard.
router.get('/invite/:token', getOfferInvite);

export default router;
