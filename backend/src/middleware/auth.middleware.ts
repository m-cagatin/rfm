import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from '../services/jwt.service';

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token required',
      error: 'NO_TOKEN'
    });
    return;
  }

  try {
    const decoded = JwtService.verifyToken(token);
    req.user = decoded; // Attach user to request object
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid or expired token',
      error: 'INVALID_TOKEN'
    });
    return;
  }
};

/**
 * Middleware to require admin role (employee)
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
    return;
  }

  if (req.user.role !== 'employee') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  next();
};

/**
 * Middleware to require any authenticated user
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'NO_AUTH'
    });
    return;
  }

  next();
};
