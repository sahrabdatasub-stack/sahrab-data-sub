import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query } from './server/db.ts';

import authRouter from './server/routes/auth.ts';
import positionsRouter from './server/routes/positions.ts';
import kycRouter from './server/routes/kyc.ts';
import walletRouter from './server/routes/wallet.ts';
import dataRouter from './server/routes/data.ts';
import dashboardsRouter from './server/routes/dashboards.ts';
import usersRouter from './server/routes/users.ts';
import ceoRouter from './server/routes/ceo.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', async (_req, res) => {
  try {
    const dbTest = await query('SELECT NOW()');
    return res.json({
      status: 'healthy',
      app: 'SAHRAB DATA SUB',
      tagline: 'Stay Connected, Stay Ahead.',
      database: 'PostgreSQL Neon Connected',
      timestamp: dbTest.rows[0].now,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/data', dataRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/users', usersRouter);
app.use('/api/ceo', ceoRouter);

// Start server
async function startServer() {
  await initDb();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Dynamic Vite middleware for dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SAHRAB] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SAHRAB] Fatal server startup error:', err);
});
