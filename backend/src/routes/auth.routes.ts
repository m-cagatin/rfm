import { Request, Response, Router } from 'express';
import { AuthService } from '../services/auth.service';
import { authenticateToken } from '../middleware/auth.middleware';

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

    // Comprehensive validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'MISSING_FIELDS',
        field: !email ? 'email' : 'password'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
        error: 'INVALID_EMAIL_FORMAT',
        field: 'email'
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        error: 'INVALID_PASSWORD_LENGTH',
        field: 'password'
      });
    }

    // Trim email to avoid whitespace issues
    const trimmedEmail = email.trim().toLowerCase();

    const result = await AuthService.loginUser(trimmedEmail, password);

    // Enhanced error responses based on specific error types
    if (!result.success) {
      let statusCode = 401;
      let errorMessage = result.message || 'Login failed';
      
      switch (result.error) {
        case 'EMAIL_NOT_FOUND':
          statusCode = 404;
          errorMessage = 'No account found with this email address';
          break;
        case 'INVALID_PASSWORD':
          statusCode = 401;
          errorMessage = 'Incorrect password. Please try again';
          break;
        case 'NO_ADMIN_ROLE':
          statusCode = 403;
          errorMessage = 'Access denied. Admin privileges required';
          break;
        case 'ACCOUNT_LOCKED':
          statusCode = 423;
          errorMessage = 'Account is temporarily locked. Please contact support';
          break;
        default:
          statusCode = 401;
          errorMessage = 'Login failed. Please check your credentials';
      }

      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: result.error,
        field: result.error === 'INVALID_PASSWORD' ? 'password' : 'email'
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later',
      error: 'SERVER_ERROR'
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
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
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

/**
 * PUT /api/auth/profile
 * Update user profile (customer only)
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can update their profile'
      });
    }

    const profileData = req.body;
    const result = await AuthService.updateCustomerProfile(user.userId, profileData);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in profile update route:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/auth/password
 * Change user password
 */
router.put('/password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { oldPassword, newPassword } = req.body;

    // Validation
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const result = await AuthService.changePassword(user.userId, user.role, oldPassword, newPassword);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in password change route:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

