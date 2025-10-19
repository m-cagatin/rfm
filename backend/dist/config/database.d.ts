import * as mysql from 'mysql2/promise';
export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
    acquireTimeout: number;
    timeout: number;
    ssl?: any;
    decimalNumbers?: boolean;
}
export declare const dbConfig: DatabaseConfig;
export declare const pool: mysql.Pool;
export declare function testConnection(): Promise<boolean>;
export declare function initializeDatabase(): Promise<void>;
export declare function closeDatabase(): Promise<void>;
//# sourceMappingURL=database.d.ts.map