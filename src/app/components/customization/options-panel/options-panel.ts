import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-options-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './options-panel.html',
  styleUrl: './options-panel.css'
})
export class OptionsPanelComponent {
  // Empty component - ready for new implementation
  constructor() {}
}
