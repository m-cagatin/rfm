"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { role, status } = req.query;
        const result = await database_service_1.DatabaseService.getUsers(role, status);
        res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/:id', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_service_1.DatabaseService.getUser(id);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { firstName, middleName, lastName, email, phone, roles, status, hired_date } = req.body;
        if (!firstName || !lastName || !email || !roles) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, email, and roles are required',
            });
        }
        const nameParts = [firstName];
        if (middleName)
            nameParts.push(middleName);
        nameParts.push(lastName);
        const fullName = nameParts.join(' ').toUpperCase();
        const rolesString = Array.isArray(roles) ? JSON.stringify(roles) : roles;
        const result = await database_service_1.DatabaseService.createUser({
            FullName: fullName,
            Email: email,
            Phone: phone || '',
            Roles: rolesString,
            Status: status || 'Active',
            hired_date,
        });
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.put('/:id', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, middleName, lastName, email, phone, roles, status, hired_date } = req.body;
        const updateData = {};
        if (firstName || middleName || lastName) {
            const nameParts = [];
            if (firstName)
                nameParts.push(firstName);
            if (middleName)
                nameParts.push(middleName);
            if (lastName)
                nameParts.push(lastName);
            updateData.FullName = nameParts.join(' ').toUpperCase();
        }
        if (email)
            updateData.Email = email;
        if (phone !== undefined)
            updateData.Phone = phone;
        if (roles)
            updateData.Roles = Array.isArray(roles) ? JSON.stringify(roles) : roles;
        if (status)
            updateData.Status = status;
        if (hired_date)
            updateData.hired_date = hired_date;
        const result = await database_service_1.DatabaseService.updateUser(id, updateData);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.delete('/:id', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_service_1.DatabaseService.deleteUser(id);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.patch('/:id/last-login', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_service_1.DatabaseService.updateUserLastLogin(id);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error updating last login:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update last login',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.routes.js.map