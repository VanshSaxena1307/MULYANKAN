import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    platform: 'MULYANKAN - Academic Project Evaluation Platform',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
