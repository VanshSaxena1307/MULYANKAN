import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getTeacherDashboard,
  getTeacherProjects,
  getTeacherProjectById,
  getTeacherProjectEvaluation,
  updateProjectAttendance,
  updateProjectMarks,
  updateProjectEvaluationBatch,
} from '../controllers/teacher.controller';

export const teacherRouter = Router();

// All teacher endpoints are strictly protected by JWT authentication middleware
teacherRouter.use(authenticateToken);

teacherRouter.get('/dashboard', getTeacherDashboard);
teacherRouter.get('/projects', getTeacherProjects);
teacherRouter.get('/projects/:id', getTeacherProjectById);

// Evaluation, Attendance, and Marks Mutation APIs
teacherRouter.get('/projects/:id/evaluation', getTeacherProjectEvaluation);
teacherRouter.put('/projects/:id/attendance', updateProjectAttendance);
teacherRouter.put('/projects/:id/marks', updateProjectMarks);
teacherRouter.put('/projects/:id/evaluation', updateProjectEvaluationBatch);
