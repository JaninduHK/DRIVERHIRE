import express from 'express';
import { showEmailPreferences, saveEmailPreferences } from '../controllers/quoteFollowUpController.js';

const router = express.Router();

// Public, token-authenticated: the "Email me less often" page linked from
// traveller emails and named in their List-Unsubscribe header. The POST also
// serves a mail client's one-click unsubscribe.
router.get('/:token', showEmailPreferences);
router.post('/:token', saveEmailPreferences);

export default router;
