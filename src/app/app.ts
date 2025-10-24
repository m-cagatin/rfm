import { CommonModule } from '@angular/common';
import { Component, signal, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('RFM Apparel Store');
  protected isAdminRoute = signal(false);
  protected userDropdownOpen = signal(false);

  constructor(
    private router: Router,
    protected authService: AuthService,
    protected cartService: CartService
  ) {
    // Check initial route
    this.isAdminRoute.set(this.router.url.startsWith('/admin'));
    
    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Check if current route is an admin route
      this.isAdminRoute.set(event.url.startsWith('/admin'));
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.user-dropdown');
    
    if (dropdown && !dropdown.contains(target)) {
      this.userDropdownOpen.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    this.userDropdownOpen.set(false);
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.userDropdownOpen.set(!this.userDropdownOpen());
  }

  closeUserDropdown(): void {
    this.userDropdownOpen.set(false);
  }
}
