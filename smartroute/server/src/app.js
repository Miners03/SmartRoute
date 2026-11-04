import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import authRoutes from './routes/authRoutes.js';
import riderRoutes from './routes/riderRoutes.js';
import depotRoutes from './routes/depotRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import deliveryBatchRoutes from './routes/deliveryBatchRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import riderAppRoutes from './routes/riderAppRoutes.js';
import importRoutes from './routes/importRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/health', async (req, res, next) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok', db: 'ok' });
    } catch (e) {
      next(e);
    }
  });

  app.use('/auth', authRoutes);
  app.use('/riders', riderRoutes);
  app.use('/depots', depotRoutes);
  app.use('/batches', batchRoutes);
  app.use('/batches/:id/deliveries', deliveryBatchRoutes);
  app.use('/batches/:id', importRoutes);
  app.use('/deliveries', deliveryRoutes);
  app.use('/', riderAppRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  app.use(errorHandler);

  return app;
}

export default createApp;
