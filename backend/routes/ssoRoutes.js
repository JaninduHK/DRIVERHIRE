import express from 'express';
import { ssoLogin, ssoCallback, ssoExchange, ssoLogout } from '../controllers/ssoController.js';

const router = express.Router();

router.get('/login', ssoLogin);
router.get('/callback', ssoCallback);
router.post('/exchange', ssoExchange);
router.get('/logout', ssoLogout);

export default router;
