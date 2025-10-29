import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-preview.html',
  styleUrl: './product-preview.css'
})
export class ProductPreviewComponent {
  // Empty component - ready for new implementation
  constructor() {}
}
