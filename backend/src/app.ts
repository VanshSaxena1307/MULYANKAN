import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { teacherRouter } from './routes/teacher.routes';

export const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base institutional API routers
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/teacher', teacherRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'MULYANKAN API',
    description: 'Academic Project Evaluation Platform Backend',
    version: '1.0.0',
    endpoints: {
      health: '/api/health'
    }
  });
});
