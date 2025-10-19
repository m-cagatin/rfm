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
   */
  async uploadImageWithProductName(file: File, productName: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'rfm_uploads');
    
    // Use slugified product name with timestamp as public_id
    const publicId = this.slugify(productName);
    formData.append('public_id', publicId);
    formData.append('folder', 'rfm_products'); // Organize in folder
    
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
}
