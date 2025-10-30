import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private cloudName = environment.cloudinary.cloudName;

  constructor() {} // Removed HttpClient - using fetch instead

  /**
   * Slugify product name for use as Cloudinary public_id
   * Example: "Cool Blue T-Shirt" -> "cool-blue-t-shirt-1729234567890"
   * Adds timestamp suffix to prevent collisions
   */
  private slugify(text: string): string {
    const slug = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-')  // Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens
    
    // Add timestamp suffix to ensure uniqueness
    const timestamp = Date.now();
    return `${slug}-${timestamp}`;
  }

  /**
   * Upload image with product name as filename
   * Product name + timestamp ensures uniqueness
   * @param folderType - 'catalog' or 'customizable' (defaults to catalog)
   */
  async uploadImageWithProductName(
    file: File, 
    productName: string, 
    folderType: 'catalog' | 'customizable' | 'customizable/variants' = 'catalog'
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'rfm_uploads');
    
    // Use slugified product name with timestamp as public_id
    const publicId = this.slugify(productName);
    formData.append('public_id', publicId);
    // Send full folder path since preset has no asset folder set
    formData.append('folder', `rfm_images/${folderType}`);
    
    // Note: 'overwrite' parameter is controlled by the upload preset settings
    // We don't need to send it manually for unsigned uploads

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  /**
   * Upload image to Cloudinary using unsigned upload
   */
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'rfm_uploads');

    try {
      // Note: For unsigned uploads, you need an upload preset
      // For now, we'll show you how to create the preset first
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedUrl(publicId: string, width?: number, height?: number, quality = 'auto'): string {
    let transformations = [];
    
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push(`q_${quality}`, 'f_auto');

    const transformString = transformations.join(',');
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformString}/${publicId}`;
  }

  /**
   * Get thumbnail URL for previews
   */
  getThumbnailUrl(publicId: string, size = 300): string {
    return this.getOptimizedUrl(publicId, size, size, 'auto');
  }

  /**
   * Get original image URL
   */
  getOriginalUrl(publicId: string): string {
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`;
  }

  /**
   * Upload multiple images to Cloudinary
   * Returns array of upload responses
   * @param folderType - 'catalog' or 'customizable' (defaults to catalog)
   */
  async uploadMultipleImages(
    files: File[], 
    productName: string,
    folderType: 'catalog' | 'customizable' = 'catalog'
  ): Promise<UploadResponse[]> {
    const uploadPromises = files.map((file, index) => {
      const publicId = this.slugify(`${productName}-${index + 1}`);
      return this.uploadImageWithPublicId(file, publicId, folderType);
    });
    
    return Promise.all(uploadPromises);
  }

  /**
   * Helper method for uploading with custom public_id
   */
  private async uploadImageWithPublicId(
    file: File, 
    publicId: string,
    folderType: 'catalog' | 'customizable' = 'catalog'
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'rfm_uploads');
    formData.append('public_id', publicId);
    formData.append('folder', `rfm_images/${folderType}`);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  /**
   * Upload catalog product images (convenience method)
   * Uploads to: rfm_images/catalog/
   */
  async uploadCatalogImages(files: File[], productName: string): Promise<UploadResponse[]> {
    return this.uploadMultipleImages(files, productName, 'catalog');
  }

  /**
   * Upload customizable product images (convenience method)
   * Uploads to: rfm_images/customizable/
   */
  async uploadCustomizableImages(files: File[], productName: string): Promise<UploadResponse[]> {
    return this.uploadMultipleImages(files, productName, 'customizable');
  }

  /**
   * Extract public_id from Cloudinary URL
   * Example: https://res.cloudinary.com/your-cloud/image/upload/v1234567890/rfm_images/catalog/product-name-123.jpg
   * Returns: rfm_images/catalog/product-name-123
   */
  extractPublicIdFromUrl(url: string): string | null {
    try {
      // Match pattern: /upload/v{version}/{public_id}.{extension}
      // OR: /upload/{public_id}.{extension}
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.\w+$/;
      const match = url.match(regex);
      
      if (match && match[1]) {
        return match[1]; // Returns the public_id with folder path
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting public_id from URL:', error);
      return null;
    }
  }

  /**
   * Delete image from Cloudinary
   * Note: This requires a server-side implementation because deletion requires authentication
   * For now, this method will return a promise that we can use when backend is ready
   * @param publicId - The public_id of the image to delete (with folder path)
   */
  async deleteImage(publicId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ Deleting image from Cloudinary:', publicId);
      
      // Get token from localStorage (same key as AuthService)
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('❌ No auth token found. Please log in.');
        return {
          success: false,
          message: 'Authentication required. Please log in.'
        };
      }
      
      // Call backend API to delete the image
      const response = await fetch(`${environment.api.baseUrl}/cloudinary/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ publicId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✓ Image deleted successfully:', publicId);
      } else {
        console.warn('⚠️ Failed to delete image:', result.message);
      }
      
      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete multiple images from Cloudinary
   */
  async deleteMultipleImages(publicIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    try {
      console.log('🗑️ Deleting multiple images from Cloudinary:', publicIds);
      
      // Get token from localStorage (same key as AuthService)
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('❌ No auth token found. Please log in.');
        return { success: false, deletedCount: 0 };
      }
      
      // Call backend API to delete multiple images
      const response = await fetch(`${environment.api.baseUrl}/cloudinary/delete-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ publicIds })
      });
      
      const result = await response.json();
      
      console.log('📦 Backend response:', result);
      
      if (result.success) {
        console.log(`✅ Successfully deleted ${result.deletedCount}/${publicIds.length} images`);
      } else {
        console.error(`❌ Deletion failed: ${result.message}`);
        console.error('Failed results:', result.results);
      }
      
      return {
        success: result.success,
        deletedCount: result.deletedCount || 0
      };
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      return { success: false, deletedCount: 0 };
    }
  }
}
