"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, phone, address, city, province, postalCode, country, dateOfBirth, emergencyContactName, emergencyContactPhone, preferredContactMethod, marketingConsent } = req.body;
        if (!email || !password || !fullName || !phone || !address) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, full name, phone, and address are required'
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        const result = await auth_service_1.AuthService.registerCustomer(email, password, fullName, phone, address, city, province, postalCode, country, dateOfBirth, emergencyContactName, emergencyContactPhone, preferredContactMethod, marketingConsent);
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Error in register route:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
                error: 'MISSING_FIELDS',
                field: !email ? 'email' : 'password'
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address',
                error: 'INVALID_EMAIL_FORMAT',
                field: 'email'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long',
                error: 'INVALID_PASSWORD_LENGTH',
                field: 'password'
            });
        }
        const trimmedEmail = email.trim().toLowerCase();
        const result = await auth_service_1.AuthService.loginUser(trimmedEmail, password);
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
    }
    catch (error) {
        console.error('Error in login route:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later',
            error: 'SERVER_ERROR'
        });
    }
});
router.post('/logout', async (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});
router.get('/me', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id, role } = req.query;
        if (!id || !role) {
            return res.status(400).json({
                success: false,
                message: 'User ID and role are required'
            });
        }
        const userId = parseInt(id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }
        let result;
        if (role === 'customer') {
            result = await auth_service_1.AuthService.getCustomerProfile(userId);
        }
        else if (role === 'employee') {
            result = await auth_service_1.AuthService.getEmployeeProfile(userId);
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be "customer" or "employee"'
            });
        }
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error in /me route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/profile', auth_middleware_1.authenticateToken, async (req, res) => {
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
        const result = await auth_service_1.AuthService.updateCustomerProfile(user.userId, profileData);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error in profile update route:', error);
        res.status(500).json({
            success: false,
            message: 'Profile update failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/password', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { oldPassword, newPassword } = req.body;
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
        const result = await auth_service_1.AuthService.changePassword(user.userId, user.role, oldPassword, newPassword);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error in password change route:', error);
        res.status(500).json({
            success: false,
            message: 'Password change failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map