import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      }

      req.user = {
        id: user.id,
        phone: user.phone,
        role: user.role,
      };
      
      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (user) {
        req.user = {
          id: user.id,
          phone: user.phone,
          role: user.role,
        };
      }
    } catch (err) {
      // Invalid token in optional auth is ignored, proceeding as guest
    }
    next();
  } catch (error) {
    next();
  }
};

export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, error: `Forbidden: Requires ${role} role` });
    }
    next();
  };
};
