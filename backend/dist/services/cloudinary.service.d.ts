export interface DeleteResult {
    success: boolean;
    result?: string;
    error?: string;
}
export declare class CloudinaryService {
    static deleteImage(publicId: string): Promise<DeleteResult>;
    static deleteMultipleImages(publicIds: string[]): Promise<{
        success: boolean;
        deletedCount: number;
        failedCount: number;
        results: DeleteResult[];
    }>;
    static deleteByPrefix(prefix: string): Promise<DeleteResult>;
}
//# sourceMappingURL=cloudinary.service.d.ts.map