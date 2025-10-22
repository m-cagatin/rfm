export interface AuthUser {
    id: number;
    email: string;
    name: string;
    role: 'customer' | 'employee';
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    dateOfBirth?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    preferredContactMethod?: 'email' | 'phone' | 'sms';
    marketingConsent?: boolean;
    roles?: string[];
}
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    user?: AuthUser;
    token?: string;
}
export declare class AuthService {
    static hashPassword(password: string): Promise<string>;
    static comparePassword(password: string, hash: string): Promise<boolean>;
    static registerCustomer(email: string, password: string, fullName: string, phone: string, address: string, city?: string, province?: string, postalCode?: string, country?: string, dateOfBirth?: string, emergencyContactName?: string, emergencyContactPhone?: string, preferredContactMethod?: 'email' | 'phone' | 'sms', marketingConsent?: boolean): Promise<ApiResponse<AuthUser>>;
    static loginUser(email: string, password: string): Promise<ApiResponse<AuthUser>>;
    static getCustomerProfile(customerId: number): Promise<ApiResponse<AuthUser>>;
    static getEmployeeProfile(userId: number): Promise<ApiResponse<AuthUser>>;
    private static parseRoles;
}
//# sourceMappingURL=auth.service.d.ts.map