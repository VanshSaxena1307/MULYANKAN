import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getTeacherDashboard,
  getTeacherProjects,
  getTeacherProjectById,
} from '../controllers/teacher.controller';

export const teacherRouter = Router();

// All teacher endpoints are strictly protected by JWT authentication middleware
teacherRouter.use(authenticateToken);

teacherRouter.get('/dashboard', getTeacherDashboard);
teacherRouter.get('/projects', getTeacherProjects);
teacherRouter.get('/projects/:id', getTeacherProjectById);
