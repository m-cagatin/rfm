"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JwtService {
    static generateToken(payload) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        const expiration = (process.env.JWT_EXPIRATION || '1h');
        const options = {
            expiresIn: expiration
        };
        return jsonwebtoken_1.default.sign({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            roles: payload.roles || []
        }, secret, options);
    }
    static verifyToken(token) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        try {
            return jsonwebtoken_1.default.verify(token, secret);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Token has expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    static isTokenExpired(token) {
        try {
            this.verifyToken(token);
            return false;
        }
        catch (error) {
            return true;
        }
    }
}
exports.JwtService = JwtService;
//# sourceMappingURL=jwt.service.js.map