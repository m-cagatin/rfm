import { Request, Response, Router } from 'express';
import { DatabaseService } from '../services/database.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/users
 * Optional query params: role, status
 * Requires: Admin authentication
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role, status } = req.query;
    const result = await DatabaseService.getUsers(
      role as string | undefined,
      status as string | undefined
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:id
 * Requires: Admin authentication
 */
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DatabaseService.getUser(id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/users
 * Body: { firstName, middleName?, lastName, email, phone, roles, status?, hired_date? }
 * Requires: Admin authentication
 */
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { firstName, middleName, lastName, email, phone, roles, status, hired_date } = req.body;

    if (!firstName || !lastName || !email || !roles) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and roles are required',
      });
    }

    // Combine name fields into FullName
    const nameParts = [firstName];
    if (middleName) nameParts.push(middleName);
    nameParts.push(lastName);
    const fullName = nameParts.join(' ').toUpperCase();

    // Convert roles array to JSON string if needed
    const rolesString = Array.isArray(roles) ? JSON.stringify(roles) : roles;

    const result = await DatabaseService.createUser({
      FullName: fullName,
      Email: email,
      Phone: phone || '',
      Roles: rolesString,
      Status: status || 'Active',
      hired_date,
    });

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/users/:id
 * Body: { firstName?, middleName?, lastName?, email?, phone?, roles?, status?, hired_date? }
 * Requires: Admin authentication
 */
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, middleName, lastName, email, phone, roles, status, hired_date } = req.body;
    
    const updateData: any = {};
    
    // Combine name fields into FullName if any name field is provided
    if (firstName || middleName || lastName) {
      const nameParts = [];
      if (firstName) nameParts.push(firstName);
      if (middleName) nameParts.push(middleName);
      if (lastName) nameParts.push(lastName);
      updateData.FullName = nameParts.join(' ').toUpperCase();
    }
    
    if (email) updateData.Email = email;
    if (phone !== undefined) updateData.Phone = phone;
    if (roles) updateData.Roles = Array.isArray(roles) ? JSON.stringify(roles) : roles;
    if (status) updateData.Status = status;
    if (hired_date) updateData.hired_date = hired_date;
    
    const result = await DatabaseService.updateUser(id, updateData);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/users/:id
 * Requires: Admin authentication
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DatabaseService.deleteUser(id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/users/:id/last-login
 * Requires: Admin authentication
 */
router.patch('/:id/last-login', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DatabaseService.updateUserLastLogin(id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error updating last login:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update last login',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
