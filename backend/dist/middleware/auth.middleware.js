"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireAdmin = exports.authenticateToken = void 0;
const jwt_service_1 = require("../services/jwt.service");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Access token required',
            error: 'NO_TOKEN'
        });
        return;
    }
    try {
        const decoded = jwt_service_1.JwtService.verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: error instanceof Error ? error.message : 'Invalid or expired token',
            error: 'INVALID_TOKEN'
        });
        return;
    }
};
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
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
exports.requireAdmin = requireAdmin;
const requireAuth = (req, res, next) => {
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
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.middleware.js.map