import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface StaticProduct {
  id: number;
  name: string;
  category: string;
  price: number;
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
  
  // Static product data (6 cards)
  protected products = signal<StaticProduct[]>([
    {
      id: 1,
      name: 'Unisex T-Shirt',
      category: 'T-Shirt',
      price: 450.00,
      placeholderClass: 'placeholder-1'
    },
    {
      id: 2,
      name: "Women's T-Shirt",
      category: 'T-Shirt',
      price: 450.00,
      placeholderClass: 'placeholder-2'
    },
    {
      id: 3,
      name: 'Sweatshirt',
      category: 'Sweatshirt',
      price: 650.00,
      placeholderClass: 'placeholder-3'
    },
    {
      id: 4,
      name: 'Hooded Sweatshirt',
      category: 'Hoodie',
      price: 750.00,
      placeholderClass: 'placeholder-4'
    },
    {
      id: 5,
      name: 'Unisex Long Sleeve',
      category: 'Long Sleeve',
      price: 500.00,
      placeholderClass: 'placeholder-5'
    },
    {
      id: 6,
      name: 'Kids Tee',
      category: 'Kids',
      price: 350.00,
      placeholderClass: 'placeholder-6'
    }
  ]);
  
  protected canScrollLeft = signal(false);
  protected canScrollRight = signal(true);
  
  constructor(private router: Router) {}
  
  ngOnInit(): void {
    // No API calls needed - using static data
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
  
  viewProductDetails(product: StaticProduct): void {
    console.log('View product:', product.name);
    // Navigate to product details (can be implemented later)
    // this.router.navigate(['/product', product.id]);
  }
}
