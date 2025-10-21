import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const GuestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isLoggedIn()) {
    // User is not logged in, allow access to login/signup pages
    return true;
  }

  // User is logged in, get their role and redirect appropriately
  const userRole = authService.getUserRole();

  if (userRole === 'employee') {
    // Admin user - redirect to admin dashboard
    router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
    return false;
  } else if (userRole === 'customer') {
    // Customer user - redirect to apparel page
    router.navigateByUrl('/apparel', { replaceUrl: true });
    return false;
  }

  // Fallback (shouldn't happen but just in case)
  router.navigateByUrl('/', { replaceUrl: true });
  return false;
};
