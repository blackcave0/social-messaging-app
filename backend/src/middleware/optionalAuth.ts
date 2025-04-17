import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but continues either way
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // If no token, just continue
    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    
    // Find user by ID
    const user = await User.findById(decoded.id).select('-password');
    
    if (user) {
      // Attach user to request
      req.user = user;
    }
    
    next();
  } catch (error) {
    // In optional auth, we just continue even if auth fails
    console.log('Optional auth failed:', error);
    next();
  }
}; 