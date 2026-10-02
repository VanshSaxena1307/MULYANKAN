import { Router } from 'express';
import { loginTeacher, getCurrentTeacher } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', loginTeacher);

// GET /api/auth/me
authRouter.get('/me', authenticateToken, getCurrentTeacher);
