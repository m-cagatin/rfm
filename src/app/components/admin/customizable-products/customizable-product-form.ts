import { Component, signal, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  gender: 'Unisex' | 'Men' | 'Women' | 'Kids';
  fitType: 'Classic' | 'Slim Fit' | 'Regular Fit' | 'Relaxed Fit' | 'Oversized' | 'Tapered' | 'Athletic Fit' | 'Muscle Fit';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './customizable-product-form.html',
  styleUrls: ['./customizable-product-form.css']
})
export class CustomizableProductFormComponent implements OnInit, OnChanges {
  @Input() productToEdit: any = null;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() productSaved = new EventEmitter<void>();
  
  message = signal('');
  messageType = signal<'success'|'error'|'info'|''>('');

  isUploading = signal(false);
  isSaving = signal(false);
  isEditMode = false;

  // Clothing sizes (Tops: T-Shirts, Polos, Jerseys, Jackets)
  clothingSizesAdult = ['XS','S','M','L','XL','2XL','3XL','4XL'];
  clothingSizesKids = ['K6','K7','K8','K9','K10'];
  
  // Pants/Shorts sizes (Waist measurements)
  pantsSizesAdult = ['26','28','30','32','34','36','38','40','42'];
  pantsSizesKids = ['22','24','26','28','30','32'];
  
  // Current available sizes (dynamically populated based on category + product type)
  availableSizes: string[] = [];
  
  categories = [
    'T-Shirt - Chinese Collar',
    'T-Shirt - V-Neck',
    'T-Shirt - Round Neck',
    'Jogging Pants',
    'Polo Shirt',
    'Sando (Jersey) - V-Neck',
    'Sando (Jersey) - Round Neck',
    'Sando (Jersey) - NBA Cut',
    'Shorts',
    'Warmers',
    'Varsity Jacket',
    'Other'
  ];
  colorsCatalog = ['Black','White','Navy','Gray','Red','Green','Blue','Beige'];
  printMethods: Array<CustomizableProductForm['printMethod']> = ['DTG','Screen Print','Embroidery'];
  printAreaOptions = ['Front','Back','Sleeve'];

  constructor(
    private cloudinaryService: CloudinaryService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  form: CustomizableProductForm = {
    name: '',
    category: '',
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

  ngOnInit() {
    console.log('🔍 ngOnInit - productToEdit:', this.productToEdit);
    // Initialize with default sizes (will update when category/type is selected)
    this.updateAvailableSizes();
    
    // If editing, populate form with existing data
    if (this.productToEdit) {
      this.isEditMode = true;
      this.populateFormWithProduct(this.productToEdit);
    }
  }
  
  ngOnChanges(changes: SimpleChanges) {
    console.log('🔄 ngOnChanges called:', changes);
    if (changes['productToEdit']) {
      const product = changes['productToEdit'].currentValue;
      if (product && !changes['productToEdit'].firstChange) {
        console.log('📥 Product to edit changed:', product);
        this.isEditMode = true;
        this.populateFormWithProduct(product);
      }
    }
  }
  
  populateFormWithProduct(product: any) {
    console.log('🔧 Populating form with product:', product);
    
    // Clear any existing data first
    this.resetForm();
    
    // Set edit mode
    this.isEditMode = true;
    
    // Basic info
    this.form.name = product.name || '';
    this.form.category = product.category || '';
    this.form.gender = product.gender || '';
    this.form.fitType = product.fit_type || '';
    this.form.description = product.description || '';
    
    // Images - store existing URLs
    this.form.frontImageUrl = product.front_image_url || '';
    this.form.backImageUrl = product.back_image_url || '';
    this.form.frontImageFile = null; // No file selected yet
    this.form.backImageFile = null;
    
    // Additional images
    if (product.additional_image_urls && Array.isArray(product.additional_image_urls)) {
      this.form.additionalImageUrls = [...product.additional_image_urls];
      this.form.additionalImageFiles = [];
    }
    
    // Fabric
    this.form.fabricComposition = product.fabric_composition || '';
    this.form.fabricWeight = product.fabric_weight || '';
    this.form.texture = product.texture || '';
    
    // Sizes
    this.form.availableSizes = Array.isArray(product.available_sizes) ? [...product.available_sizes] : [];
    this.form.fitDescription = product.fit_description || '';
    this.form.sizeChartUrl = product.size_chart_url || '';
    this.sizePricing = product.size_pricing ? { ...product.size_pricing } : {};
    
    // Colors - deep clone
    this.form.availableColors = Array.isArray(product.available_colors) 
      ? product.available_colors.map((c: any) => ({ ...c })) 
      : [];
    
    // Variants - deep clone with proper structure
    if (Array.isArray(product.variants)) {
      this.variants = product.variants.map((v: any) => ({
        name: v.name,
        imageUrl: v.image_url || '',
        imageFile: undefined
      }));
    } else {
      this.variants = [];
    }
    console.log('🎨 Variants populated:', this.variants);
    
    // ✅ Manually trigger change detection to update the UI
    this.cdr.detectChanges();
    
    // Print & Customization
    this.form.printMethod = product.print_method || '';
    this.form.printAreas = Array.isArray(product.print_areas) ? [...product.print_areas] : [];
    this.form.designRequirements = product.design_requirements || '';
    
    // Pricing
    this.form.baseCost = product.base_cost || 0;
    this.form.retailPrice = product.retail_price || 0;
    
    // Order requirements
    this.form.turnaroundTime = product.turnaround_time || '';
    this.form.minimumOrderQty = product.minimum_order_qty || 1;
    
    // Status
    this.form.isActive = product.is_active === 1 || product.is_active === true;
    
    console.log('✅ Form populated. Current form state:', this.form);
    console.log('✅ Variants:', this.variants);
    
    this.message.set('📝 Editing: ' + product.name);
    this.messageType.set('info');
  }

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

  // Update available sizes based on category and product type
  updateAvailableSizes() {
    const isPants = this.form.category.includes('Jogging Pants') || 
                    this.form.category.includes('Shorts');
    const isKids = this.form.gender === 'Kids';
    
    if (isPants) {
      // For pants/shorts, use waist measurements
      this.availableSizes = isKids ? this.pantsSizesKids : this.pantsSizesAdult;
    } else {
      // For tops (T-Shirts, Polos, Jerseys, Jackets), use standard sizes
      this.availableSizes = isKids ? this.clothingSizesKids : this.clothingSizesAdult;
    }
    
    // Clear previously selected sizes that are no longer valid
    this.form.availableSizes = [];
    this.sizePricing = {};
  }

  onCategoryChange() {
    this.updateAvailableSizes();
  }

  onProductTypeChange() {
    // Update sizes when product type changes
    this.updateAvailableSizes();
    // This ensures only appropriate sizes (adult or kids) are selected
    this.form.availableSizes = [];
    this.sizePricing = {};
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

  validateForm(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Basic Info
    if (!this.form.category) {
      errors.push('Product Category is required');
    }
    if (!this.form.gender) {
      errors.push('Product Type is required');
    }

    // 2. Images - only required if creating new product (not editing)
    if (!this.isEditMode) {
      if (!this.form.frontImageFile) {
        errors.push('Front View Image is required');
      }
      if (!this.form.backImageFile) {
        errors.push('Back View Image is required');
      }
    } else {
      // In edit mode, images are optional (keep existing if not uploading new ones)
      if (!this.form.frontImageFile && !this.form.frontImageUrl) {
        errors.push('Front View Image is required');
      }
      if (!this.form.backImageFile && !this.form.backImageUrl) {
        errors.push('Back View Image is required');
      }
    }

    // 3. Sizes
    if (this.form.availableSizes.length === 0) {
      errors.push('Please select at least one size');
    }

    // 4. Pricing
    if (!this.form.retailPrice || this.form.retailPrice <= 0) {
      errors.push('Retail Price must be greater than 0');
    }

    // 5. Colors
    if (this.form.availableColors.length === 0) {
      errors.push('Please add at least one color');
    }

    // 6. Print Areas
    if (this.form.printAreas.length === 0) {
      errors.push('Please select at least one print area');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  save() {
    // Validate form
    const validation = this.validateForm();
    
    if (!validation.valid) {
      // Show all errors
      const errorMessage = '⚠️ Please fix the following errors:\n\n' + 
        validation.errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
      this.setMessage(errorMessage, 'error');
      
      // Scroll to top to see error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.uploadAndSave();
  }

  async uploadAndSave() {
    try {
      this.isUploading.set(true);
      this.setMessage('📤 Uploading images to Cloudinary...', 'info');

      // Upload front image only if a new file was selected
      if (this.form.frontImageFile) {
        const frontResult = await this.cloudinaryService.uploadImageWithProductName(
          this.form.frontImageFile,
          `${this.form.category}-front`,
          'customizable'
        );
        this.form.frontImageUrl = frontResult.secure_url;
      }
      // If editing and no new file, keep existing URL (already set in form)

      // Upload back image only if a new file was selected
      if (this.form.backImageFile) {
        const backResult = await this.cloudinaryService.uploadImageWithProductName(
          this.form.backImageFile,
          `${this.form.category}-back`,
          'customizable'
        );
        this.form.backImageUrl = backResult.secure_url;
      }
      // If editing and no new file, keep existing URL (already set in form)

      // Upload size chart if provided
      if (this.form.sizeChartFile) {
        const sizeChartResult = await this.cloudinaryService.uploadImageWithProductName(
          this.form.sizeChartFile,
          `${this.form.category}-sizechart`,
          'customizable'
        );
        this.form.sizeChartUrl = sizeChartResult.secure_url;
      }

      // Upload additional images if any
      if (this.form.additionalImageFiles.length > 0) {
        const additionalResults = await this.cloudinaryService.uploadCustomizableImages(
          this.form.additionalImageFiles,
          this.form.category
        );
        this.form.additionalImageUrls = additionalResults.map(r => r.secure_url);
      }

      // Upload variant images
      const variantUploads = this.variants.filter(v => v.imageFile).map(async variant => {
        if (variant.imageFile) {
          const result = await this.cloudinaryService.uploadImageWithProductName(
            variant.imageFile,
            `${this.form.category}-variant-${variant.name}`,
            'customizable/variants'
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
        name: this.form.category, // Use category as product name (e.g., "T-Shirt", "Hoodie")
        category: this.form.category,
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
      if (this.isEditMode && this.productToEdit) {
        // Update existing product
        this.apiService.updateCustomizableProduct(String(this.productToEdit.id), productData).subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.setMessage('✅ Product updated successfully!', 'success');
            
            // Emit event to parent and show success for 3 seconds, then reset
            this.productSaved.emit();
            setTimeout(() => {
              this.resetForm();
              this.clearMessage();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 3000);
          },
          error: (error) => {
            this.isSaving.set(false);
            console.error('Update error:', error);
            
            let errorMsg = 'Failed to update product';
            if (error.error?.message) {
              errorMsg = error.error.message;
            } else if (error.message) {
              errorMsg = error.message;
            }
            
            this.setMessage(errorMsg, 'error');
          }
        });
      } else {
        // Create new product
        this.apiService.createCustomizableProduct(productData).subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.setMessage('✅ Product created successfully!', 'success');
            
            // Emit event to parent and show success for 3 seconds, then reset
            this.productSaved.emit();
            setTimeout(() => {
              this.resetForm();
              this.clearMessage();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 3000);
          },
          error: (error) => {
            this.isSaving.set(false);
            console.error('Save error:', error);
            
            let errorMsg = 'Failed to save product';
            if (error.error?.message) {
              errorMsg = error.error.message;
            } else if (error.message) {
              errorMsg = error.message;
            } else if (error.status === 0) {
              errorMsg = 'Cannot connect to server. Please check if the backend is running.';
            } else if (error.status === 500) {
              errorMsg = 'Server error. Please check backend logs.';
            }
            
            this.setMessage(`❌ ${errorMsg}`, 'error');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      }

    } catch (error: any) {
      this.isUploading.set(false);
      this.isSaving.set(false);
      console.error('Upload error:', error);
      
      let errorMsg = 'Image upload failed';
      if (error.message) {
        errorMsg = error.message;
      }
      
      this.setMessage(`❌ ${errorMsg}. Please try again.`, 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetForm() {
    this.form = {
      name: '',
      category: '',
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

  private messageTimeout: any = null;

  private setMessage(msg: string, type: 'success'|'error'|'info'){
    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    
    this.message.set(msg);
    this.messageType.set(type);
    
    // Only auto-clear success and info messages after 5 seconds
    // Error messages stay until manually dismissed or form is submitted successfully
    if (type === 'success' || type === 'info') {
      this.messageTimeout = setTimeout(() => { 
        this.message.set(''); 
        this.messageType.set('success'); 
      }, 5000);
    }
  }

  clearMessage() {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    this.message.set('');
    this.messageType.set('success');
  }

  onCancel() {
    if (this.isSaving() || this.isUploading()) {
      return; // Don't allow cancel during save/upload
    }
    
    // Ask for confirmation if form has data
    const hasData = this.form.name || this.form.category || this.form.frontImageFile || 
                    this.form.backImageFile || this.form.availableSizes.length > 0;
    
    if (hasData) {
      if (!confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        return;
      }
    }
    
    this.formCancelled.emit();
  }
}
