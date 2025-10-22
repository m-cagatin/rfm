import { Request, Response, Router } from 'express';
import { AuthService } from '../services/auth.service';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new customer account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, address, city, province, postalCode, 
            country, dateOfBirth, emergencyContactName, emergencyContactPhone, 
            preferredContactMethod, marketingConsent } = req.body;

    // Validation
    if (!email || !password || !fullName || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, full name, phone, and address are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Password validation (min 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const result = await AuthService.registerCustomer(
      email,
      password,
      fullName,
      phone,
      address,
      city,
      province,
      postalCode,
      country,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      preferredContactMethod,
      marketingConsent
    );

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error in register route:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user (customer or employee)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.loginUser(email, password);

    res.status(result.success ? 200 : 401).json(result);
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side handled, this is placeholder)
 */
router.post('/logout', async (req: Request, res: Response) => {
  // Since we're using localStorage on frontend, logout is client-side
  // This endpoint can be used for server-side session cleanup if needed later
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/me
 * Get current user profile by ID and role
 * Query params: id (user ID), role (customer or employee)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const { id, role } = req.query;

    if (!id || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID and role are required'
      });
    }

    const userId = parseInt(id as string);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    let result;
    if (role === 'customer') {
      result = await AuthService.getCustomerProfile(userId);
    } else if (role === 'employee') {
      result = await AuthService.getEmployeeProfile(userId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "customer" or "employee"'
      });
    }

    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error in /me route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

