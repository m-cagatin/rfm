export interface JwtPayload {
    userId: number;
    email: string;
    role: 'customer' | 'employee';
    roles?: string[];
    iat?: number;
    exp?: number;
}
export declare class JwtService {
    static generateToken(payload: {
        userId: number;
        email: string;
        role: 'customer' | 'employee';
        roles?: string[];
    }): string;
    static verifyToken(token: string): JwtPayload;
    static isTokenExpired(token: string): boolean;
}
//# sourceMappingURL=jwt.service.d.ts.map