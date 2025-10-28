import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface StockEntry {
  size: string;
  color: string;
  quantity: number;
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
  availableColors: string[];
  // 6. Print & Customization
  printMethod: 'DTG' | 'Screen Print' | 'Embroidery';
  printAreas: string[]; // Front, Back, Sleeve
  designRequirements: string;
  // 7. Pricing & Stock
  baseCost: number;
  retailPrice: number;
  stock: StockEntry[]; // per size/color
  isActive: boolean;
  // 8. Shipping & Fulfillment
  productionTimeDays: number;
  shippingTime: string;
  weightPerItem: number;
}

@Component({
  selector: 'app-customizable-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customizable-product-form.html',
  styleUrls: ['./customizable-product-form.css']
})
export class CustomizableProductFormComponent {
  message = signal('');
  messageType = signal<'success'|'error'|'info'|''>('');

  sizes = ['XS','S','M','L','XL','2XL','3XL'];
  categories = ['T-Shirt','Hoodie','Sweatshirt','Jacket','Polo Shirt','Long Sleeve','Tank Top','Other'];
  colorsCatalog = ['Black','White','Navy','Gray','Red','Green','Blue','Beige'];
  printMethods: Array<CustomizableProductForm['printMethod']> = ['DTG','Screen Print','Embroidery'];
  printAreaOptions = ['Front','Back','Sleeve'];

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
    productionTimeDays: 3,
    shippingTime: '3–7 business days',
    weightPerItem: 0.2
  };

  // image previews
  frontPreview: string | null = null;
  backPreview: string | null = null;
  logoPreview: string | null = null;
  additionalPreviews: string[] = [];
  sizeChartPreview: string | null = null;

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
    if (checked) {
      if (!this.form.availableColors.includes(color)) this.form.availableColors.push(color);
    } else {
      this.form.availableColors = this.form.availableColors.filter(c => c !== color);
      this.form.stock = this.form.stock.filter(e => e.color !== color);
    }
    this.regenerateStockGrid();
  }

  regenerateStockGrid() {
    const wanted: StockEntry[] = [];
    for (const size of this.form.availableSizes) {
      for (const color of this.form.availableColors) {
        wanted.push({ size, color, quantity: 0 });
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

    // For now, just emit a success message; backend integration can be added next
    this.setMessage('Form captured. Ready to integrate uploads and API save.', 'success');
  }

  private setMessage(msg: string, type: 'success'|'error'|'info'){
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(()=>{ this.message.set(''); this.messageType.set(''); }, 3000);
  }
}
