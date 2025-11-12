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
  // 2. Images - NEW SCHEMA with publicId tracking
  frontImageFile?: File | null;
  backImageFile?: File | null;
  logoImageFile?: File | null;
  additionalImageFiles: File[];
  frontImageUrl?: string;
  frontImagePublicId?: string;
  backImageUrl?: string;
  backImagePublicId?: string;
  logoImageUrl?: string;
  logoImagePublicId?: string;
  additionalImages: Array<{url: string; publicId?: string; displayOrder: number}>;
  // 3. Material & Fabric
  fabricComposition: string;
  fabricWeight: string;
  texture: string;
  // 4. Sizes & Fit
  availableSizes: string[];
  fitDescription: string;
  // 5. Colors & Variants
  selectedColor: ColorVariant | null;
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
  // Add missing methods for template and TS error fixes

  clearMessage() {
    this.message.set('');
    this.messageType.set('');
  }

  onCancel() {
    if (this.isSaving() || this.isUploading()) {
      return; // Don't allow cancel during save/upload
    }
    
    // Check if there are actual unsaved changes
    const hasChanges = this.hasUnsavedChanges || 
                      this.form.frontImageFile !== null || 
                      this.form.backImageFile !== null || 
                      this.form.additionalImageFiles.length > 0 ||
                      this.imagesToDeleteOnSave.length > 0 ||
                      this.colorsToDeleteOnSave.length > 0 ||
                      this.variantsToDeleteOnSave.length > 0 ||
                      this.variants.some(v => v.imageFile); // New variant images
    
    if (hasChanges) {
      if (!confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        return;
      }
    }
    
    // Clear tracking arrays
    this.imagesToDeleteOnSave = [];
    this.colorsToDeleteOnSave = [];
    this.variantsToDeleteOnSave = [];
    this.hasUnsavedChanges = false;
    
    this.formCancelled.emit();
  }

  resetForm() {
    // Reset your form fields to initial state
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
      frontImageUrl: '',
      frontImagePublicId: '',
      backImageUrl: '',
      backImagePublicId: '',
      logoImageUrl: '',
      logoImagePublicId: '',
      additionalImages: [],
      fabricComposition: '',
      fabricWeight: '',
      texture: '',
      availableSizes: [],
      fitDescription: '',
      selectedColor: null,
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
    this.frontPreview = null;
    this.backPreview = null;
    this.logoPreview = null;
    this.additionalPreviews = [];
    this.variants = [];
    this.sizePricing = {};
    this.colorSearchQuery = '';
    this.variantName = '';
    this.variantFileName = '';
    this.variantImageFile = null;
    this.variantImagePreview = null;
    this.imagesToDeleteOnSave = [];  // ✅ Clear deletion tracking
    this.colorsToDeleteOnSave = [];
    this.variantsToDeleteOnSave = [];
    this.hasUnsavedChanges = false;
  }

  setMessage(msg: string, type: 'success'|'error'|'info'|'') {
    // Clear any existing timeout
    if ((this as any).messageTimeout) {
      clearTimeout((this as any).messageTimeout);
    }
    this.message.set(msg);
    this.messageType.set(type);
    
    // Auto-dismiss success and info messages after 5 seconds
    if (type === 'success' || type === 'info') {
      (this as any).messageTimeout = setTimeout(() => {
        if (this.message() === msg) { // Only clear if message hasn't changed
          this.clearMessage();
        }
      }, 5000);
    }
  }
  errors: any = {};
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
    additionalImages: [],
    fabricComposition: '',
    fabricWeight: '',
    texture: '',
    availableSizes: [],
    fitDescription: '',
    selectedColor: null,
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

  // Color and Variant Management
  colorSearchQuery: string = '';
  variantName: string = '';
  variantFileName: string = '';
  variantImageFile: File | null = null;
  variantImagePreview: string | null = null;
  variants: TextureVariant[] = [];

  // Size Pricing (e.g., { 'XL': 50, '2XL': 100, '3XL': 150 })
  sizePricing: { [size: string]: number } = {};

  // Track images marked for deletion (additional images only)
  private imagesToDeleteOnSave: string[] = [];
  
  // Track colors/variants marked for deletion
  private colorsToDeleteOnSave: ColorVariant[] = [];
  private variantsToDeleteOnSave: TextureVariant[] = [];
  
  // Track if form has unsaved changes
  private hasUnsavedChanges = false;

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
    
    // Images - NEW SCHEMA: parse images array and populate form fields
    const normalizedImages = this.normalizeImages(product.images);
    const frontImg = normalizedImages.find(img => img.imageType === 'front');
    const backImg = normalizedImages.find(img => img.imageType === 'back');
    const additionalImgs = normalizedImages.filter(img => img.imageType === 'additional');
    
    this.form.frontImageUrl = frontImg?.url || '';
    this.form.frontImagePublicId = frontImg?.publicId || '';
    this.form.backImageUrl = backImg?.url || '';
    this.form.backImagePublicId = backImg?.publicId || '';
    
    this.form.additionalImages = additionalImgs.map((img, index) => ({
      url: img.url,
      publicId: img.publicId || '',
      displayOrder: img.displayOrder || index + 1
    }));
    this.reindexAdditionalImages();
    this.form.frontImageFile = null; // No file selected yet
    this.form.backImageFile = null;
    this.form.additionalImageFiles = [];
    
    // Fabric
    this.form.fabricComposition = product.fabric_composition || '';
    this.form.fabricWeight = product.fabric_weight || '';
    this.form.texture = product.texture || '';
    
    // Sizes
    this.form.availableSizes = Array.isArray(product.available_sizes) ? [...product.available_sizes] : [];
    this.form.fitDescription = product.fit_description || '';
    this.sizePricing = product.size_pricing ? { ...product.size_pricing } : {};
    
    // Color - single object from database fields
    this.form.selectedColor = (product.color_name && product.color_hex)
      ? { name: product.color_name, hex: product.color_hex }
      : null;
    
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

  private normalizeImages(images: any): Array<{ url: string; publicId?: string; imageType?: 'front' | 'back' | 'additional'; displayOrder?: number }> {
    if (!images) return [];

    const rawImages = Array.isArray(images)
      ? images
      : typeof images === 'string'
        ? this.safeParseImages(images)
        : [];

    return rawImages
      .map((img: any) => ({
        url: img.url,
        publicId: img.publicId ?? img.cloudinary_public_id,
        imageType: img.imageType ?? img.image_type,
        displayOrder: img.displayOrder ?? img.display_order
      }))
      .filter(img => !!img.url);
  }

  private safeParseImages(value: string): any[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private reindexAdditionalImages(): void {
    this.form.additionalImages = this.form.additionalImages
      .map((img, idx) => ({
        ...img,
        displayOrder: idx + 1
      }));
  }

  onFileSelected(event: Event, field: 'front'|'back'|'logo'|'additional') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    
    // File size validation constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    const WARN_FILE_SIZE = 5 * 1024 * 1024;  // 5MB warning threshold
    const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];

    // Validate each file
    for (const file of files) {
      // Check file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        this.setMessage(`❌ "${file.name}" is not a valid image format. Please upload JPG, PNG, or SVG only.`, 'error');
        input.value = ''; // Clear the input
        return;
      }

      // Check file size - HARD LIMIT
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        this.setMessage(`❌ "${file.name}" is too large (${sizeMB}MB). Maximum file size is 10MB. Please compress or resize the image.`, 'error');
        input.value = ''; // Clear the input
        return;
      }

      // Warning for large files (5-10MB)
      if (file.size > WARN_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        this.setMessage(`⚠️ "${file.name}" is ${sizeMB}MB. Consider using a smaller file for faster uploads (recommended under 5MB).`, 'info');
      }
    }

    const file = files[0];

    const toDataUrl = (f: File) => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(String(e.target?.result));
      reader.readAsDataURL(f);
    });

    if (field === 'front') { this.form.frontImageFile = file; toDataUrl(file).then(u=> this.frontPreview = u); }
    if (field === 'back') { this.form.backImageFile = file; toDataUrl(file).then(u=> this.backPreview = u); }
    if (field === 'logo') { this.form.logoImageFile = file; toDataUrl(file).then(u=> this.logoPreview = u); }
    if (field === 'additional') {
      this.form.additionalImageFiles = files;
      this.additionalPreviews = [];
      files.forEach(async f => this.additionalPreviews.push(await toDataUrl(f)));
    }
  }

  // Cancel new front image upload (revert to existing)
  cancelFrontImage() {
    const hasExistingImage = !!this.form.frontImageUrl;
    const message = hasExistingImage 
      ? 'Are you sure you want to choose a different front image? This will discard your current selection.'
      : 'Are you sure you want to choose a different front image? Your current upload will be discarded.';
    
    if (confirm(message)) {
      this.form.frontImageFile = null;
      this.frontPreview = '';
      // If there was an old image, it will show again
    }
  }

  // Cancel new back image upload (revert to existing)
  cancelBackImage() {
    const hasExistingImage = !!this.form.backImageUrl;
    const message = hasExistingImage 
      ? 'Are you sure you want to choose a different back image? This will discard your current selection.'
      : 'Are you sure you want to choose a different back image? Your current upload will be discarded.';
    
    if (confirm(message)) {
      this.form.backImageFile = null;
      this.backPreview = '';
      // If there was an old image, it will show again
    }
  }

  // Remove existing additional image (marks for deletion on save)
  removeAdditionalImage(index: number) {
    const image = this.form.additionalImages[index];
    
    if (!confirm(`🗑️ Remove this additional image?\n\nThis cannot be undone once you save the form.`)) {
      return;
    }
    
    // Mark for deletion
    if (image.publicId) {
      this.imagesToDeleteOnSave.push(image.publicId);
    }
    
    // Remove from array
    this.form.additionalImages.splice(index, 1);
    this.reindexAdditionalImages();
    
    this.setMessage('ℹ️ Additional image will be removed when you save the form.', 'info');
  }

  // Remove newly selected additional image (preview only, not saved yet)
  removeNewAdditionalImage(index: number) {
    this.additionalPreviews.splice(index, 1);
    const filesArray = Array.from(this.form.additionalImageFiles);
    filesArray.splice(index, 1);
    this.form.additionalImageFiles = filesArray;
  }

  // Legacy methods - kept for compatibility (not used in new design)
  removeFrontImage(fileInput: HTMLInputElement) {
    this.frontPreview = null;
    this.form.frontImageFile = null;
    this.form.frontImageUrl = '';
    fileInput.value = '';
  }

  removeBackImage(fileInput: HTMLInputElement) {
    this.backPreview = null;
    this.form.backImageFile = null;
    this.form.backImageUrl = '';
    fileInput.value = '';
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

    // Check if already have a color (limit to 1 only)
    if (this.form.selectedColor !== null) {
      this.setMessage('Only 1 color allowed. Remove the existing color first.', 'error');
      return;
    }

    // Assign the color
    this.form.selectedColor = { name: colorName, hex: hexCode };
    this.hasUnsavedChanges = true;
    this.colorSearchQuery = '';
    this.setMessage(`Color "${colorName}" added successfully`, 'success');
  }

  removeColor(): void {
    if (!this.form.selectedColor) return;
    
    const colorName = this.form.selectedColor.name;
    
    if (!confirm(`🗑️ Remove color "${colorName}"?\n\nThis will be removed when you save the form.`)) {
      return;
    }
    
    // If it has imageUrl, it exists in database - track for deletion
    // For colors, we check if they exist by checking if we're in edit mode
    if (this.isEditMode) {
      this.colorsToDeleteOnSave.push({...this.form.selectedColor});
    }
    
    // Remove from display immediately
    this.form.selectedColor = null;
    this.hasUnsavedChanges = true;
    this.setMessage(`ℹ️ Color "${colorName}" will be removed when you save.`, 'info');
  }

  // Helper method - returns array with single color if exists
  getActiveColors(): ColorVariant[] {
    return this.form.selectedColor ? [this.form.selectedColor] : [];
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

    // Check if already have 1 variant (limit to 1 only)
    if (this.variants.length >= 1) {
      this.setMessage('Only 1 variant allowed. Remove the existing variant first.', 'error');
      return;
    }

    const variant: TextureVariant = {
      name,
      imageUrl: this.variantImagePreview || undefined,
      imageFile: this.variantImageFile || undefined
    };

    this.variants.push(variant);
    this.hasUnsavedChanges = true;
    
    // Reset form
    this.variantName = '';
    this.variantFileName = '';
    this.variantImageFile = null;
    this.variantImagePreview = null;
    
    this.setMessage(`Variant "${name}" added successfully`, 'success');
  }

  removeVariant(index: number): void {
    const variant = this.variants[index];
    const hasExistingVariant = !!variant.imageUrl;
    
    const message = hasExistingVariant
      ? `Are you sure you want to choose a different variant? This will replace "${variant.name}".`
      : `Are you sure you want to choose a different variant? Your current selection "${variant.name}" will be discarded.`;
    
    if (!confirm(message)) {
      return;
    }
    
    // If it has imageUrl (exists in database), track for deletion
    if (variant.imageUrl) {
      this.variantsToDeleteOnSave.push({...variant});
    }
    
    // Remove from display immediately
    this.variants.splice(index, 1);
    this.hasUnsavedChanges = true;
    this.setMessage(`ℹ️ Variant "${variant.name}" will be removed when you save.`, 'info');
  }

  // Helper methods for variant display
  getExistingVariants(): TextureVariant[] {
    return this.variants.filter(v => v.imageUrl && !v.imageFile);
  }

  getNewVariants(): TextureVariant[] {
    return this.variants.filter(v => v.imageFile);
  }

  getVariantIndex(variant: TextureVariant): number {
    return this.variants.indexOf(variant);
  }

  regenerateStockGrid() {
    const wanted: StockEntry[] = [];
    if (this.form.selectedColor) {
      for (const size of this.form.availableSizes) {
        wanted.push({ size, color: this.form.selectedColor.name, quantity: 0 });
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

  // Profit calculation helpers
  getProfit(): number {
    return this.form.retailPrice - this.form.baseCost;
  }

  getProfitMargin(): string {
    if (this.form.baseCost === 0) return '0.0';
    const margin = (this.getProfit() / this.form.baseCost * 100);
    return margin.toFixed(1);
  }

  isProfitable(): boolean {
    return this.getProfit() > 0;
  }

  validateForm(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    this.errors = {}; // Reset inline errors

    // 1. Basic Info
    if (!this.form.category) {
      errors.push('Product Category is required');
      this.errors['category'] = 'Product Category is required';
    }
    if (!this.form.gender) {
      errors.push('Product Type is required');
      this.errors['gender'] = 'Product Type is required';
    }

    // 2. Images - only required if creating new product (not editing)
    if (!this.isEditMode) {
      if (!this.form.frontImageFile) {
        errors.push('Front View Image is required');
        this.errors['images_front'] = 'Front View Image is required';
      }
      if (!this.form.backImageFile) {
        errors.push('Back View Image is required');
        this.errors['images_back'] = 'Back View Image is required';
      }
    } else {
      // In edit mode, images are optional (keep existing if not uploading new ones)
      if (!this.form.frontImageFile && !this.form.frontImageUrl) {
        errors.push('Front View Image is required');
        this.errors['images_front'] = 'Front View Image is required';
      }
      if (!this.form.backImageFile && !this.form.backImageUrl) {
        errors.push('Back View Image is required');
        this.errors['images_back'] = 'Back View Image is required';
      }
    }

    // 3. Sizes
    if (this.form.availableSizes.length === 0) {
      errors.push('Please select at least one size');
      this.errors['availableSizes'] = 'Please select at least one size';
    }

    // 4. Pricing
    if (!this.form.retailPrice || this.form.retailPrice <= 0) {
      errors.push('Retail Price must be greater than 0');
      this.errors['retailPrice'] = 'Retail Price must be greater than 0';
    }

    // 5. Colors
    if (!this.form.selectedColor) {
      errors.push('Please add a color');
      this.errors['selectedColor'] = 'Please add a color';
    }

    // 6. Print Areas
    if (this.form.printAreas.length === 0) {
      errors.push('Please select at least one print area');
      this.errors['printAreas'] = 'Please select at least one print area';
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  save() {
    console.log('🔵 Save button clicked');
    console.log('🔵 Form data:', {
      category: this.form.category,
      gender: this.form.gender,
      frontImageFile: this.form.frontImageFile ? 'FILE SELECTED' : 'NO FILE',
      backImageFile: this.form.backImageFile ? 'FILE SELECTED' : 'NO FILE',
      frontImageUrl: this.form.frontImageUrl || 'NO URL',
      backImageUrl: this.form.backImageUrl || 'NO URL'
    });
    
    // Validate form (frontend)
    const validation = this.validateForm();
    console.log('🔵 Validation result:', validation);
    if (!validation.valid) {
      const errorMessage = '⚠️ Please fix the following errors:\n\n' + 
        validation.errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
      this.setMessage(errorMessage, 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Try to save, catch backend errors
    this.uploadAndSave();
  }

  async uploadAndSave() {
    // Track uploaded images for rollback if database save fails
    const uploadedImages: string[] = [];
    // Track old images to delete after successful update (merge manual deletions)
    const oldImagesToDelete: string[] = [...this.imagesToDeleteOnSave];
    
    try {
      this.isUploading.set(true);
      this.setMessage('📤 Uploading images to Cloudinary...', 'info');

      // Upload front image only if a new file was selected
      if (this.form.frontImageFile) {
        // Store old image ID for deletion after successful update
        if (this.isEditMode && this.form.frontImagePublicId) {
          oldImagesToDelete.push(this.form.frontImagePublicId);
        }
        
        const frontResult = await this.cloudinaryService.uploadImageWithProductName(
          this.form.frontImageFile,
          `${this.form.category}-front`,
          'customizable'
        );
        this.form.frontImageUrl = frontResult.secure_url;
        this.form.frontImagePublicId = frontResult.public_id;
        uploadedImages.push(frontResult.public_id); // Track for rollback
      }
      // If editing and no new file, keep existing URL (already set in form)

      // Upload back image only if a new file was selected
      if (this.form.backImageFile) {
        // Store old image ID for deletion after successful update
        if (this.isEditMode && this.form.backImagePublicId) {
          oldImagesToDelete.push(this.form.backImagePublicId);
        }
        
        const backResult = await this.cloudinaryService.uploadImageWithProductName(
          this.form.backImageFile,
          `${this.form.category}-back`,
          'customizable'
        );
        this.form.backImageUrl = backResult.secure_url;
        this.form.backImagePublicId = backResult.public_id;
        uploadedImages.push(backResult.public_id); // Track for rollback
      }
      // If editing and no new file, keep existing URL (already set in form)

      // Upload additional images if any - NEW: track publicId
      if (this.form.additionalImageFiles.length > 0) {
        const additionalResults = await this.cloudinaryService.uploadCustomizableImages(
          this.form.additionalImageFiles,
          this.form.category
        );
        const newAdditionalImages = additionalResults.map((r, index) => ({
          url: r.secure_url,
          publicId: r.public_id,
          displayOrder: this.form.additionalImages.length + index + 1
        }));
        // Track for rollback
        additionalResults.forEach(r => uploadedImages.push(r.public_id));
        this.form.additionalImages = [...this.form.additionalImages, ...newAdditionalImages];
        this.reindexAdditionalImages();
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
          uploadedImages.push(result.public_id); // Track for rollback
          delete variant.imageFile; // Remove file object before sending to API
        }
      });
      await Promise.all(variantUploads);

      this.isUploading.set(false);
      this.isSaving.set(true);
      this.setMessage('💾 Saving product to database...', 'info');

      // Build images array for NEW SCHEMA
      const images = [];
      
      // Front image (required)
      if (this.form.frontImageUrl) {
        images.push({
          url: this.form.frontImageUrl,
          publicId: this.form.frontImagePublicId || '',
          imageType: 'front',
          displayOrder: 1
        });
      }
      
      // Back image (required)
      if (this.form.backImageUrl) {
        images.push({
          url: this.form.backImageUrl,
          publicId: this.form.backImagePublicId || '',
          imageType: 'back',
          displayOrder: 1
        });
      }
      
      // Additional images
      this.reindexAdditionalImages();
      this.form.additionalImages.forEach((img, index) => {
        images.push({
          url: img.url,
          publicId: img.publicId || '',
          imageType: 'additional',
          displayOrder: index + 1
        });
      });

      // Final validation: ensure we have at least front and back images
      if (images.length < 2) {
        this.isSaving.set(false);
        this.setMessage('❌ Error: Both front and back images are required. Please upload both images before saving.', 'error');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const hasFront = images.some(img => img.imageType === 'front');
      const hasBack = images.some(img => img.imageType === 'back');
      
      if (!hasFront || !hasBack) {
        this.isSaving.set(false);
        this.setMessage('❌ Error: Both front and back view images are required. Please check your uploads.', 'error');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      console.log('📤 Sending images array to backend:', images); // Debug log

      // Prepare data for API
      const productData = {
        name: this.form.name, // Product name from separate input field
        category: this.form.category, // Product category from dropdown
        gender: this.form.gender,
        fit_type: this.form.fitType,
        description: this.form.description,
        images: images, // NEW: images array with explicit types
        fabric_composition: this.form.fabricComposition,
        fabric_weight: this.form.fabricWeight,
        texture: this.form.texture,
        available_sizes: this.form.availableSizes,
        fit_description: this.form.fitDescription,
        size_pricing: this.sizePricing, // Size-based pricing
        // Send single color fields
        color_name: this.form.selectedColor?.name || null,
        color_hex: this.form.selectedColor?.hex || null,
        // Send single variant fields (extract first variant if exists)
        variant_name: this.variants.length > 0 ? this.variants[0].name : null,
        variant_image_url: this.variants.length > 0 ? this.variants[0].imageUrl : null,
        variant_image_public_id: null, // Will be set during image upload
        print_method: this.form.printMethod,
        print_areas: this.form.printAreas,
        design_requirements: this.form.designRequirements,
        base_cost: this.form.baseCost,
        retail_price: this.form.retailPrice,
        is_active: this.form.isActive,
        turnaround_time: this.form.turnaroundTime,
        minimum_order_qty: this.form.minimumOrderQty
      };

      // Save to API
      if (this.isEditMode && this.productToEdit) {
        // Update existing product
        this.apiService.updateCustomizableProduct(String(this.productToEdit.id), productData).subscribe(
          async (response) => {
            this.isSaving.set(false);
            this.setMessage('✅ Product updated successfully!\n\nYour changes have been saved.', 'success');
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to show message
            
            // ✅ SUCCESS! Delete old images from Cloudinary
            if (oldImagesToDelete.length > 0) {
              console.log('🗑️ Deleting old images:', oldImagesToDelete);
              for (const publicId of oldImagesToDelete) {
                try {
                  await this.cloudinaryService.deleteImage(publicId);
                  console.log('✅ Deleted old image:', publicId);
                } catch (deleteError) {
                  console.warn('⚠️ Failed to delete old image:', publicId, deleteError);
                  // Don't fail the whole operation if cleanup fails
                }
              }
              // Clear the tracking array after successful deletion
              this.imagesToDeleteOnSave = [];
            }

            // ✅ SUCCESS! Clear tracking arrays (colors/variants already spliced from display)
            this.colorsToDeleteOnSave = [];
            this.variantsToDeleteOnSave = [];
            this.hasUnsavedChanges = false;
            
            // Wait 3 seconds to allow user to see success message
            setTimeout(() => {
              this.productSaved.emit();
            }, 3000);
          },
          async (error) => {
            this.isSaving.set(false);
            
            // ❌ ROLLBACK: Delete newly uploaded images
            if (uploadedImages.length > 0) {
              console.log('🔄 Rolling back uploaded images:', uploadedImages);
              for (const publicId of uploadedImages) {
                try {
                  await this.cloudinaryService.deleteImage(publicId);
                  console.log('✅ Rolled back image:', publicId);
                } catch (deleteError) {
                  console.warn('⚠️ Failed to rollback image:', publicId, deleteError);
                }
              }
            }
            
            if (error?.error?.errors) {
              this.errors = error.error.errors;
              this.setMessage('⚠️ Please fix the highlighted errors below.', 'error');
            } else if (error.status === 0) {
              this.setMessage('❌ Cannot connect to server. Please check if the backend is running.', 'error');
            } else if (error.status === 500) {
              this.setMessage('❌ Server error. Please check backend logs.', 'error');
            } else {
              this.setMessage('❌ An unknown error occurred.', 'error');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        );
      } else {
        // Create new product
        this.apiService.createCustomizableProduct(productData).subscribe(
          (response) => {
            this.isSaving.set(false);
            this.setMessage('✅ Product created successfully!\n\nYour new product has been added.', 'success');
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to show message
            // Clear tracking on success
            uploadedImages.length = 0;
            this.imagesToDeleteOnSave = [];
            this.colorsToDeleteOnSave = [];
            this.variantsToDeleteOnSave = [];
            this.hasUnsavedChanges = false;
            
            // Wait 3 seconds to allow user to see success message
            setTimeout(() => {
              this.productSaved.emit();
            }, 3000);
          },
          async (error) => {
            this.isSaving.set(false);
            
            // ❌ ROLLBACK: Delete newly uploaded images
            if (uploadedImages.length > 0) {
              console.log('🔄 Rolling back uploaded images:', uploadedImages);
              for (const publicId of uploadedImages) {
                try {
                  await this.cloudinaryService.deleteImage(publicId);
                  console.log('✅ Rolled back image:', publicId);
                } catch (deleteError) {
                  console.warn('⚠️ Failed to rollback image:', publicId, deleteError);
                }
              }
            };
            if (error?.error?.errors) {
              this.errors = error.error.errors;
              this.setMessage('⚠️ Please fix the highlighted errors below.', 'error');
            } else if (error.status === 0) {
              this.setMessage('❌ Cannot connect to server. Please check if the backend is running.', 'error');
            } else if (error.status === 500) {
              this.setMessage('❌ Server error. Please check backend logs.', 'error');
            } else {
              this.setMessage('❌ An unknown error occurred.', 'error');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        );
      }

    } catch (error: any) {
      this.isUploading.set(false);
      this.isSaving.set(false);
      console.error('Upload error:', error);
      
      // ❌ ROLLBACK: Delete newly uploaded images if upload process fails
      if (uploadedImages.length > 0) {
        console.log('🔄 Rolling back uploaded images due to upload failure:', uploadedImages);
        for (const publicId of uploadedImages) {
          try {
            await this.cloudinaryService.deleteImage(publicId);
            console.log('✅ Rolled back image:', publicId);
          } catch (deleteError) {
            console.warn('⚠️ Failed to rollback image:', publicId, deleteError);
          }
        }
      }
      
      let errorMsg = 'Image upload failed';
      if (error.message) {
        errorMsg = error.message;
      }
      
      this.setMessage(`❌ ${errorMsg}. Please try again.`, 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

}
