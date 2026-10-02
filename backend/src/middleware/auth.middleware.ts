import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from '../controllers/auth.controller';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};
