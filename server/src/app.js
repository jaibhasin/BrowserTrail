import express from 'express';
import cors from 'cors';
import { analyzeUrl } from './routes/analyze.js';
import { analyzeUrlStream } from './routes/analyzeStream.js';
import { createRateLimiter } from './lib/rateLimit.js';

function corsOptions() {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5180')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'));
    },
  };
}

export function createApp({ rateLimit } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/analyze', createRateLimiter(rateLimit));
  app.get('/api/analyze', analyzeUrl);
  app.get('/api/analyze/stream', analyzeUrlStream);
  return app;
}
