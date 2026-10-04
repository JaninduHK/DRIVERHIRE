import express from 'express';
import { handleBrevoInbound } from '../controllers/emailInboundController.js';

const router = express.Router();

// Public, shared-secret-authenticated: called by Brevo's inbound parsing
// webhook when a traveller replies to a conversation email. See
// emailInboundController for the auth model.
router.post('/brevo', handleBrevoInbound);

export default router;
