import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

router.get('/rider', authMiddleware, requireRole('rider'), async (req, res, next) => {
  // Phase 1 placeholder per spec
  res.json({ message: 'Your route will appear here in a later phase' });
});

export default router;
