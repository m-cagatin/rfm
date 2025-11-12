import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

interface CarouselProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  imageUrl?: string | null;
  placeholderClass: string;
}

@Component({
  selector: 'app-apparel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './apparel.html',
  styleUrl: './apparel.css'
})
export class ApparelComponent implements OnInit, AfterViewInit {
  @ViewChild('carouselContainer') carouselContainer!: ElementRef;
  
  private readonly placeholderClasses = [
    'placeholder-1',
    'placeholder-2',
    'placeholder-3',
    'placeholder-4',
    'placeholder-5',
    'placeholder-6'
  ];
  
  protected products = signal<CarouselProduct[]>([]);
  protected loading = signal(false);
  
  protected canScrollLeft = signal(false);
  protected canScrollRight = signal(true);
  
  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}
  
  ngOnInit(): void {
    this.fetchProducts();
  }
  
  ngAfterViewInit(): void {
    // Initialize arrow states after view renders
    setTimeout(() => this.updateArrowStates(), 100);
  }
  
  // Carousel scroll logic
  scrollCarousel(direction: 'left' | 'right'): void {
    const container = this.carouselContainer.nativeElement;
    const cardWidth = container.querySelector('.carousel-card')?.offsetWidth || 0;
    const gap = 24;
    const scrollAmount = cardWidth + gap;
    
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    
    setTimeout(() => this.updateArrowStates(), 300);
  }
  
  updateArrowStates(): void {
    const container = this.carouselContainer?.nativeElement;
    if (!container) return;
    
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    this.canScrollLeft.set(scrollLeft > 5);
    this.canScrollRight.set(scrollLeft < maxScroll - 5);
  }

  private fetchProducts(): void {
    this.loading.set(true);
    this.apiService.getCustomizableProducts().subscribe({
      next: (response: any) => {
        const data: any[] = response?.data ?? [];
        const grouped = this.groupByCategoryEarliest(data);
        this.products.set(grouped);
        this.loading.set(false);
        setTimeout(() => this.updateArrowStates(), 150);
      },
      error: (error) => {
        console.error('Failed to load customizable products for apparel carousel:', error);
        this.products.set([]);
        this.loading.set(false);
        setTimeout(() => this.updateArrowStates(), 150);
      }
    });
  }

  private groupByCategoryEarliest(products: any[]): CarouselProduct[] {
    const categoryMap = new Map<string, { product: any; createdAt: number }>();

    products
      .filter(product => product && product.category && product.is_active)
      .forEach(product => {
        const createdAt = new Date(product.created_at ?? product.createdAt ?? 0).getTime();
        const key = product.category;
        const existing = categoryMap.get(key);

        if (!existing || createdAt < existing.createdAt) {
          categoryMap.set(key, { product, createdAt });
        }
      });

    const carouselItems: CarouselProduct[] = [];
    Array.from(categoryMap.values())
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((entry, index) => {
        const product = entry.product;
        carouselItems.push({
          id: product.id ?? product.product_id ?? index,
          name: product.name ?? product.product_name ?? product.category,
          category: product.category ?? 'Uncategorized',
          price: Number(product.retail_price ?? product.price ?? 0),
          imageUrl: this.getFrontImageUrl(product),
          placeholderClass: this.placeholderClasses[index % this.placeholderClasses.length]
        });
      });

    return carouselItems;
  }

  private getFrontImageUrl(product: any): string | null {
    const images = this.normalizeImages(product?.images);
    const frontImage = images.find(img => (img.imageType ?? img.image_type) === 'front');
    return frontImage?.url ?? null;
  }

  private normalizeImages(images: any): Array<any> {
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
  
  viewProductDetails(product: CarouselProduct): void {
    console.log('View product:', product.name);
    // Navigate to product details (can be implemented later)
    // this.router.navigate(['/product', product.id]);
  }
}
