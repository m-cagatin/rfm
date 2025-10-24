import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-customization',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customization.html',
  styleUrl: './customization.css'
})
export class CustomizationComponent {
  // Empty component - ready for new customization implementation
  constructor() {}
}
