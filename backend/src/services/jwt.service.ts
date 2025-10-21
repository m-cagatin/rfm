import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';

export interface JwtPayload {
  userId: number;
  email: string;
  role: 'customer' | 'employee';
  roles?: string[];
  iat?: number;
  exp?: number;
}

export class JwtService {
  /**
   * Generate JWT token with user data
   */
  static generateToken(payload: {
    userId: number;
    email: string;
    role: 'customer' | 'employee';
    roles?: string[];
  }): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const expiration: StringValue | number = (process.env.JWT_EXPIRATION || '1h') as StringValue;
    const options: SignOptions = {
      expiresIn: expiration
    };

    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        roles: payload.roles || []
      },
      secret,
      options
    );
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Check if token is expired without throwing error
   */
  static isTokenExpired(token: string): boolean {
    try {
      this.verifyToken(token);
      return false;
    } catch (error) {
      return true;
    }
  }
}
