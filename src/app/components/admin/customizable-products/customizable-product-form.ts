import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CloudinaryService } from '../../../services/cloudinary.service';
import { ApiService } from '../../../services/api';

interface StockEntry {
  size: string;
  color: string;
  quantity: number;
}

interface ColorVariant {
  name: string;
  hex: string;
}

interface TextureVariant {
  name: string;
  imageUrl?: string;
  imageFile?: File;
}

interface CustomizableProductForm {
  // 1. Basic Info
  name: string;
  category: string;
  brand: string;
  gender: 'Unisex' | 'Men' | 'Women' | 'Kids';
  fitType: 'Classic' | 'Slim' | 'Oversized';
  description: string;
  // 2. Images
  frontImageFile?: File | null;
  backImageFile?: File | null;
  logoImageFile?: File | null;
  additionalImageFiles: File[];
  frontImageUrl?: string;
  backImageUrl?: string;
  logoImageUrl?: string;
  additionalImageUrls: string[];
  // 3. Material & Fabric
  fabricComposition: string;
  fabricWeight: string;
  texture: string;
  // 4. Sizes & Fit
  availableSizes: string[];
  sizeChartFile?: File | null;
  sizeChartUrl?: string;
  fitDescription: string;
  // 5. Colors & Variants
  availableColors: ColorVariant[];
  // 6. Print & Customization
  printMethod: 'DTG' | 'Screen Print' | 'Embroidery';
  printAreas: string[]; // Front, Back, Sleeve
  designRequirements: string;
  // 7. Pricing & Stock
  baseCost: number;
  retailPrice: number;
  stock: StockEntry[]; // per size/color
  isActive: boolean;
  // 8. Business Details
  turnaroundTime: string;
  minimumOrderQty: number;
}

@Component({
  selector: 'app-customizable-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customizable-product-form.html',
  styleUrls: ['./customizable-product-form.css']
})
export class CustomizableProductFormComponent {
  message = signal('');
  messageType = signal<'success'|'error'|'info'|''>('');

  isUploading = signal(false);
  isSaving = signal(false);

  sizes = ['XS','S','M','L','XL','2XL','3XL'];
  categories = ['T-Shirt','Hoodie','Sweatshirt','Jacket','Polo Shirt','Long Sleeve','Tank Top','Other'];
  colorsCatalog = ['Black','White','Navy','Gray','Red','Green','Blue','Beige'];
  printMethods: Array<CustomizableProductForm['printMethod']> = ['DTG','Screen Print','Embroidery'];
  printAreaOptions = ['Front','Back','Sleeve'];

  constructor(
    private cloudinaryService: CloudinaryService,
    private apiService: ApiService
  ) {}

  form: CustomizableProductForm = {
    name: '',
    category: '',
    brand: '',
    gender: 'Unisex',
    fitType: 'Classic',
    description: '',
    frontImageFile: null,
    backImageFile: null,
    logoImageFile: null,
    additionalImageFiles: [],
    additionalImageUrls: [],
    fabricComposition: '',
    fabricWeight: '',
    texture: '',
    availableSizes: [],
    sizeChartFile: null,
    fitDescription: '',
    availableColors: [],
    printMethod: 'DTG',
    printAreas: [],
    designRequirements: '300 DPI PNG with transparent background',
    baseCost: 0,
    retailPrice: 0,
    stock: [],
    isActive: true,
    turnaroundTime: '3-5 days',
    minimumOrderQty: 1
  };

  // image previews
  frontPreview: string | null = null;
  backPreview: string | null = null;
  logoPreview: string | null = null;
  additionalPreviews: string[] = [];
  sizeChartPreview: string | null = null;

  // Color and Variant Management
  colorSearchQuery: string = '';
  variantName: string = '';
  variantFileName: string = '';
  variantImageFile: File | null = null;
  variantImagePreview: string | null = null;
  variants: TextureVariant[] = [];

  // Size Pricing (e.g., { 'XL': 50, '2XL': 100, '3XL': 150 })
  sizePricing: { [size: string]: number } = {};

  onFileSelected(event: Event, field: 'front'|'back'|'logo'|'sizeChart'|'additional') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const file = files[0];

    const toDataUrl = (f: File) => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(String(e.target?.result));
      reader.readAsDataURL(f);
    });

    if (field === 'front') { this.form.frontImageFile = file; toDataUrl(file).then(u=> this.frontPreview = u); }
    if (field === 'back') { this.form.backImageFile = file; toDataUrl(file).then(u=> this.backPreview = u); }
    if (field === 'logo') { this.form.logoImageFile = file; toDataUrl(file).then(u=> this.logoPreview = u); }
    if (field === 'sizeChart') { this.form.sizeChartFile = file; toDataUrl(file).then(u=> this.sizeChartPreview = u); }
    if (field === 'additional') {
      this.form.additionalImageFiles = files;
      this.additionalPreviews = [];
      files.forEach(async f => this.additionalPreviews.push(await toDataUrl(f)));
    }
  }

  removeAdditionalImage(index: number) {
    this.additionalPreviews.splice(index, 1);
    const filesArray = Array.from(this.form.additionalImageFiles);
    filesArray.splice(index, 1);
    this.form.additionalImageFiles = filesArray;
  }

  toggleSize(size: string, checked: boolean) {
    if (checked) {
      if (!this.form.availableSizes.includes(size)) this.form.availableSizes.push(size);
    } else {
      this.form.availableSizes = this.form.availableSizes.filter(s => s !== size);
      this.form.stock = this.form.stock.filter(e => e.size !== size);
    }
    this.regenerateStockGrid();
  }

  toggleColor(color: string, checked: boolean) {
    // This method is no longer used - kept for backward compatibility
    // Colors are now managed through addColorFromSearch() and removeColor()
  }

  // Color Management Methods
  addColorFromSearch(): void {
    const query = this.colorSearchQuery.trim();
    if (!query) {
      this.setMessage('Please enter a color name or hex code', 'error');
      return;
    }

    // Try to parse as hex code or color name
    let colorName = query;
    let hexCode = '';

    // Check if it's a hex code
    if (query.startsWith('#')) {
      hexCode = query.toUpperCase();
      colorName = this.getColorNameFromHex(hexCode);
    } else if (/^[0-9A-Fa-f]{6}$/.test(query)) {
      hexCode = '#' + query.toUpperCase();
      colorName = this.getColorNameFromHex(hexCode);
    } else {
      // Treat as color name
      hexCode = this.getHexFromColorName(query);
      colorName = query.charAt(0).toUpperCase() + query.slice(1);
    }

    // Check if color already exists
    const exists = this.form.availableColors.some(c => c.hex === hexCode);
    if (exists) {
      this.setMessage('Color already added', 'info');
      return;
    }

    this.form.availableColors.push({ name: colorName, hex: hexCode });
    this.colorSearchQuery = '';
    this.setMessage(`Color "${colorName}" added successfully`, 'success');
  }

  removeColor(index: number): void {
    const removed = this.form.availableColors.splice(index, 1);
    if (removed.length > 0) {
      this.setMessage(`Color "${removed[0].name}" removed`, 'info');
    }
  }

  getColorNameFromHex(hex: string): string {
    // Simple color name mapping
    const colorMap: {[key: string]: string} = {
      '#000000': 'Black',
      '#FFFFFF': 'White',
      '#FF0000': 'Red',
      '#00FF00': 'Green',
      '#0000FF': 'Blue',
      '#FFFF00': 'Yellow',
      '#FFA500': 'Orange',
      '#800080': 'Purple',
      '#FFC0CB': 'Pink',
      '#808080': 'Gray',
      '#A52A2A': 'Brown',
      '#000080': 'Navy'
    };
    return colorMap[hex.toUpperCase()] || hex;
  }

  getHexFromColorName(name: string): string {
    // Simple color name to hex mapping
    const colorMap: {[key: string]: string} = {
      'black': '#000000',
      'white': '#FFFFFF',
      'red': '#FF0000',
      'green': '#00FF00',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'orange': '#FFA500',
      'purple': '#800080',
      'pink': '#FFC0CB',
      'gray': '#808080',
      'grey': '#808080',
      'brown': '#A52A2A',
      'navy': '#000080'
    };
    return colorMap[name.toLowerCase()] || '#' + Math.floor(Math.random()*16777215).toString(16).toUpperCase().padStart(6, '0');
  }

  // Variant Management Methods
  onVariantImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.variantImageFile = file;
      this.variantFileName = file.name;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.variantImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  addVariant(): void {
    const name = this.variantName.trim();
    if (!name) {
      this.setMessage('Please enter a variant name', 'error');
      return;
    }

    const variant: TextureVariant = {
      name,
      imageUrl: this.variantImagePreview || undefined,
      imageFile: this.variantImageFile || undefined
    };

    this.variants.push(variant);
    
    // Reset form
    this.variantName = '';
    this.variantFileName = '';
    this.variantImageFile = null;
    this.variantImagePreview = null;
    
    this.setMessage(`Variant "${name}" added successfully`, 'success');
  }

  removeVariant(index: number): void {
    const removed = this.variants.splice(index, 1);
    if (removed.length > 0) {
      this.setMessage(`Variant "${removed[0].name}" removed`, 'info');
    }
  }

  regenerateStockGrid() {
    const wanted: StockEntry[] = [];
    for (const size of this.form.availableSizes) {
      for (const color of this.form.availableColors) {
        wanted.push({ size, color: color.name, quantity: 0 });
      }
    }

    // merge existing quantities where combo matches
    const merged: StockEntry[] = wanted.map(w => {
      const existing = this.form.stock.find(s => s.size === w.size && s.color === w.color);
      return { ...w, quantity: existing?.quantity ?? 0 };
    });
    this.form.stock = merged;
  }

  trackByStock = (_: number, item: StockEntry) => `${item.size}-${item.color}`;

  togglePrintArea(area: string, checked: boolean) {
    const exists = this.form.printAreas.includes(area);
    if (checked && !exists) {
      this.form.printAreas.push(area);
    } else if (!checked && exists) {
      this.form.printAreas = this.form.printAreas.filter(a => a !== area);
    }
  }

  save() {
    // Basic required checks
    if (!this.form.name || !this.form.category) {
      this.setMessage('Please fill in Product Name and Category', 'error');
      return;
    }
    if (!this.form.frontImageFile || !this.form.backImageFile) {
      this.setMessage('Front and Back images are required', 'error');
      return;
    }
    if (this.form.retailPrice <= 0) {
      this.setMessage('Please enter a valid retail price', 'error');
      return;
    }

    this.uploadAndSave();
  }

  async uploadAndSave() {
    try {
      this.isUploading.set(true);
      this.setMessage('📤 Uploading images to Cloudinary...', 'info');

      // Upload front image
      const frontResult = await this.cloudinaryService.uploadImageWithProductName(
        this.form.frontImageFile!,
        `${this.form.name}-front`,
        'customizable'
      );
      this.form.frontImageUrl = frontResult.secure_url;

      // Upload back image
      const backResult = await this.cloudinaryService.uploadImageWithProductName(
        this.form.backImageFile!,
        `${this.form.name}-back`,
        'customizable'
      );
      this.form.backImageUrl = backResult.secure_url;

      // Upload size chart if provided
      if (this.form.sizeChartFile) {
        const sizeChartResult = await this.cloudinaryService.uploadImageWithProductName(
          this.form.sizeChartFile,
          `${this.form.name}-sizechart`,
          'customizable'
        );
        this.form.sizeChartUrl = sizeChartResult.secure_url;
      }

      // Upload additional images if any
      if (this.form.additionalImageFiles.length > 0) {
        const additionalResults = await this.cloudinaryService.uploadCustomizableImages(
          this.form.additionalImageFiles,
          this.form.name
        );
        this.form.additionalImageUrls = additionalResults.map(r => r.secure_url);
      }

      // Upload variant images
      const variantUploads = this.variants.filter(v => v.imageFile).map(async variant => {
        if (variant.imageFile) {
          const result = await this.cloudinaryService.uploadImageWithProductName(
            variant.imageFile,
            `${this.form.name}-variant-${variant.name}`,
            'customizable'
          );
          variant.imageUrl = result.secure_url;
          delete variant.imageFile; // Remove file object before sending to API
        }
      });
      await Promise.all(variantUploads);

      this.isUploading.set(false);
      this.isSaving.set(true);
      this.setMessage('💾 Saving product to database...', 'info');

      // Prepare data for API
      const productData = {
        name: this.form.name,
        category: this.form.category,
        brand: this.form.brand,
        gender: this.form.gender,
        fit_type: this.form.fitType,
        description: this.form.description,
        front_image_url: this.form.frontImageUrl,
        back_image_url: this.form.backImageUrl,
        additional_image_urls: this.form.additionalImageUrls,
        fabric_composition: this.form.fabricComposition,
        fabric_weight: this.form.fabricWeight,
        texture: this.form.texture,
        available_sizes: this.form.availableSizes,
        size_chart_url: this.form.sizeChartUrl,
        fit_description: this.form.fitDescription,
        size_pricing: this.sizePricing, // Size-based pricing
        available_colors: this.form.availableColors,
        variants: this.variants.map(v => ({ name: v.name, image_url: v.imageUrl })),
        print_method: this.form.printMethod,
        print_areas: this.form.printAreas,
        design_requirements: this.form.designRequirements,
        retail_price: this.form.retailPrice,
        is_active: this.form.isActive,
        turnaround_time: this.form.turnaroundTime,
        minimum_order_qty: this.form.minimumOrderQty
      };

      // Save to API
      this.apiService.createCustomizableProduct(productData).subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.setMessage('✅ Product saved successfully!', 'success');
          
          // Reset form after 2 seconds
          setTimeout(() => {
            this.resetForm();
          }, 2000);
        },
        error: (error) => {
          this.isSaving.set(false);
          console.error('Save error:', error);
          this.setMessage(`❌ Failed to save product: ${error.error?.message || error.message}`, 'error');
        }
      });

    } catch (error: any) {
      this.isUploading.set(false);
      this.isSaving.set(false);
      console.error('Upload error:', error);
      this.setMessage(`❌ Upload failed: ${error.message}`, 'error');
    }
  }

  resetForm() {
    this.form = {
      name: '',
      category: '',
      brand: '',
      gender: 'Unisex',
      fitType: 'Classic',
      description: '',
      frontImageFile: null,
      backImageFile: null,
      logoImageFile: null,
      additionalImageFiles: [],
      additionalImageUrls: [],
      fabricComposition: '',
      fabricWeight: '',
      texture: '',
      availableSizes: [],
      sizeChartFile: null,
      fitDescription: '',
      availableColors: [],
      printMethod: 'DTG',
      printAreas: [],
      designRequirements: '300 DPI PNG with transparent background',
      baseCost: 0,
      retailPrice: 0,
      stock: [],
      isActive: true,
      turnaroundTime: '3-5 days',
      minimumOrderQty: 1
    };

    // Reset previews
    this.frontPreview = null;
    this.backPreview = null;
    this.logoPreview = null;
    this.additionalPreviews = [];
    this.sizeChartPreview = null;
    this.variants = [];
    this.sizePricing = {}; // Reset size pricing
    this.colorSearchQuery = '';
    this.variantName = '';
    this.variantFileName = '';
    this.variantImageFile = null;
    this.variantImagePreview = null;
  }

  private setMessage(msg: string, type: 'success'|'error'|'info'){
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(()=>{ this.message.set(''); this.messageType.set(''); }, 3000);
  }
}
