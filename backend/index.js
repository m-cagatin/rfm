const express = require('express');
const cors = require('cors'); // Required for frontend connection
const pool = require('./db'); // Assumed to export the MySQL connection pool
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares ---

// Enable CORS for Angular frontend (allow any localhost port)
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);

        // Allow all localhost origins (e.g., http://localhost:4200)
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
        }

        // Production or blocked origin
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Middleware to parse JSON request bodies
app.use(express.json());

// Disable caching for all API routes (admin needs live data)
app.use('/api', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});

// --- Routes ---

// 1. Health/DB Test Check
app.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT NOW() AS now');
        res.send(`DB Connected! Server time: ${rows[0].now}`);
    } catch (err) {
        console.error("Database Connection Check Failed:", err);
        res.status(500).send('Database connection failed');
    }
});

// 2. Authentication Routes (Login)
// Assumed to handle POST /api/auth/login and utilize auth.service.js
const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authRoutes);

// 3. USERS (Employee/Admin) CRUD Routes

// GET all users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Users');

        // Transform database rows to match frontend interface (splitting FullName)
        const users = rows.map(row => {
            const nameParts = row.FullName ? row.FullName.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            return {
                id: row.UserId,
                firstName: firstName,
                lastName: lastName,
                email: row.Email,
                phone: row.Phone,
                roles: row.Roles ? row.Roles.split(',').map(r => r.trim()) : [],
                status: row.Status || 'Active',
                hiredDate: row.hired_date,
                lastLogin: row.last_login,
                created_at: row.created_at,
                updated_at: row.updated_at
            };
        });

        res.json({
            success: true,
            data: users,
            message: 'Users retrieved successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            message: err.message
        });
    }
});

// GET single user by id
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM Users WHERE UserId = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const row = rows[0];
        const nameParts = row.FullName ? row.FullName.split(' ') : ['', ''];
        const user = {
            id: row.UserId,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: row.Email,
            phone: row.Phone,
            roles: row.Roles ? row.Roles.split(',').map(r => r.trim()) : [],
            status: row.Status || 'Active',
            hiredDate: row.hired_date,
            lastLogin: row.last_login,
            created_at: row.created_at,
            updated_at: row.updated_at
        };

        res.json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
            message: err.message
        });
    }
});

// POST create new user
app.post('/api/users', async (req, res) => {
    try {
        const { FullName, Email, Password } = req.body;
        // IMPORTANT: Hash the password before insertion in a real app!
        // For this example, we assume Password is the raw value, but DB expects PasswordHash
        const hashedPassword = await bcrypt.hash(Password, 10);

        const [result] = await pool.query(
            'INSERT INTO Users (FullName, Email, PasswordHash) VALUES (?, ?, ?)',
            [FullName, Email, hashedPassword]
        );

        const newUserId = result.insertId;

        res.status(201).json({
            success: true,
            data: {
                id: newUserId,
                fullName: FullName,
                email: Email
            },
            message: 'User created successfully.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            message: err.message
        });
    }
});

// PUT update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { FullName, Email, Password, Phone, Roles, Status } = req.body;

        let updateFields = [];
        let updateValues = [];

        if (FullName) { updateFields.push('FullName = ?'); updateValues.push(FullName); }
        if (Email) { updateFields.push('Email = ?'); updateValues.push(Email); }
        if (Phone) { updateFields.push('Phone = ?'); updateValues.push(Phone); }
        if (Roles) { updateFields.push('Roles = ?'); updateValues.push(Roles); }
        if (Status) { updateFields.push('Status = ?'); updateValues.push(Status); }

        if (Password) {
            const hashedPassword = await bcrypt.hash(Password, 10);
            updateFields.push('PasswordHash = ?');
            updateValues.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        const sql = `UPDATE Users SET ${updateFields.join(', ')} WHERE UserId = ?`;
        updateValues.push(id);

        const [result] = await pool.query(sql, updateValues);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            message: err.message
        });
    }
});

// DELETE user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM Users WHERE UserId = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
