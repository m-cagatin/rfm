import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomizableProductFormComponent } from './customizable-product-form';

@Component({
  selector: 'app-admin-customizable-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customizable-products.html',
  styleUrls: ['./customizable-products.css']
})
export class AdminCustomizableProductsComponent {
  showForm = signal(false);
  formComponent = CustomizableProductFormComponent;
}
