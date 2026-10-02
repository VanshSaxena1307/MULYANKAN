import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, teachers } from '@mulyankan/database';
import { sql } from 'drizzle-orm';
import { env } from '../config/env';

export interface AuthTokenPayload {
  id: string;
  userId: string;
  name: string;
  role: string;
  department: string;
  designation: string | null;
}

export const loginTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const inputIdentifier = req.body.userId || req.body.username;
    const inputPassword = req.body.password;

    if (!inputIdentifier || typeof inputIdentifier !== 'string' || !inputIdentifier.trim()) {
      res.status(400).json({ error: 'Please enter your Username / User ID' });
      return;
    }

    if (!inputPassword || typeof inputPassword !== 'string') {
      res.status(400).json({ error: 'Please enter your password' });
      return;
    }

    const trimmedIdentifier = inputIdentifier.trim();

    // 1. Fetch teacher by user_id (case-insensitive)
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(sql`lower(${teachers.userId}) = lower(${trimmedIdentifier})`)
      .limit(1);

    if (!teacher) {
      res.status(401).json({ error: 'Invalid User ID or password' });
      return;
    }

    // 2. Check is_active
    if (!teacher.isActive) {
      res.status(403).json({
        error: 'This faculty account is currently inactive. Please contact the Academic Office.',
      });
      return;
    }

    // 3. Verify bcrypt password hash
    const isPasswordValid = await bcrypt.compare(inputPassword, teacher.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid User ID or password' });
      return;
    }

    // 4. Generate authenticated JWT session token
    const tokenPayload: AuthTokenPayload = {
      id: teacher.id,
      userId: teacher.userId,
      name: teacher.name,
      role: teacher.role,
      department: teacher.department,
      designation: teacher.designation,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // 5. Return authenticated session
    res.status(200).json({
      message: 'Login successful',
      token,
      teacher: {
        id: teacher.id,
        userId: teacher.userId,
        name: teacher.name,
        role: teacher.role,
        department: teacher.department,
        designation: teacher.designation,
        mustChangePassword: teacher.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const getCurrentTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user as AuthTokenPayload;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const [teacher] = await db
      .select({
        id: teachers.id,
        userId: teachers.userId,
        name: teachers.name,
        role: teachers.role,
        department: teachers.department,
        designation: teachers.designation,
        mustChangePassword: teachers.mustChangePassword,
        isActive: teachers.isActive,
      })
      .from(teachers)
      .where(sql`${teachers.id} = ${user.id}`)
      .limit(1);

    if (!teacher || !teacher.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    res.status(200).json({ teacher });
  } catch (error) {
    console.error('Get current teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
