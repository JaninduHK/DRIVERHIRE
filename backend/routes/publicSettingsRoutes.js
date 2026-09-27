import express from 'express';
import { getSetting, SETTING_KEYS } from '../models/Setting.js';

const router = express.Router();

/**
 * Unauthenticated read of the handful of flags the public site needs (the quote
 * form cannot reach /api/admin/settings). Every field is listed explicitly — the
 * settings store also holds platform bank details, so this must never spread it.
 */
router.get('/public', async (_req, res) => {
  try {
    const briefDriverTypeSelection =
      (await getSetting(SETTING_KEYS.BRIEF_DRIVER_TYPE_SELECTION, true)) !== false;
    return res.json({ settings: { briefDriverTypeSelection } });
  } catch (error) {
    console.error('Public settings error:', error);
    // Fail open to the default so the quote form still renders.
    return res.json({ settings: { briefDriverTypeSelection: true } });
  }
});

export default router;
