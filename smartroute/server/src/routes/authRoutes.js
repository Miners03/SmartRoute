import express from 'express';
import { loginLimiter } from '../middleware/rateLimitLogin.js';
import { login, me } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.get('/me', authMiddleware, me);

export default router;
