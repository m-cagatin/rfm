import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, AuthUser } from '../../services/auth.service';
import { OrderService, Order } from '../../services/order.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-settings',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './account-settings.html',
  styleUrl: './account-settings.css'
})
export class AccountSettingsComponent implements OnInit {
  user: AuthUser | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  isSaving: boolean = false;
  
  // Tab management
  activeTab = signal<'profile' | 'password' | 'orders'>('profile');
  
  // Edit mode
  isEditMode: boolean = false;
  
  // Forms
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  
  // Orders
  orders = signal<Order[]>([]);
  ordersLoading = signal(false);
  ordersError = signal<string | null>(null);

  constructor(
    protected authService: AuthService,
    private orderService: OrderService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    // Redirect employees to admin panel
    if (this.user.role === 'employee') {
      this.router.navigate(['/admin']);
      return;
    }

    this.initForms();
    this.loadUserProfile();
  }

  initForms(): void {
    // Profile form - only essential fields
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: [''],
      province: [''],
      postalCode: [''],
      country: [''],
      dateOfBirth: [''],
      emergencyContactName: [''],
      emergencyContactPhone: ['']
    });

    // Password form
    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.getCurrentUserProfile().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.user) {
          this.user = response.user;
          this.populateProfileForm();
        } else {
          this.errorMessage = response.message || 'Failed to load profile';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Failed to load profile. Please try again.';
        console.error('Error loading profile:', error);
      }
    });
  }

  populateProfileForm(): void {
    if (this.user) {
      this.profileForm.patchValue({
        name: this.user.name || '',
        email: this.user.email || '',
        phone: this.user.phone || '',
        address: this.user.address || '',
        city: this.user.city || '',
        province: this.user.province || '',
        postalCode: this.user.postalCode || '',
        country: this.user.country || '',
        dateOfBirth: this.user.dateOfBirth || '',
        emergencyContactName: this.user.emergencyContactName || '',
        emergencyContactPhone: this.user.emergencyContactPhone || ''
      });
    }
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    this.errorMessage = '';
    this.successMessage = '';
    
    if (this.isEditMode) {
      this.populateProfileForm();
    }
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      this.isSaving = true;
      this.errorMessage = '';
      this.successMessage = '';

      const profileData = this.profileForm.value;
      
      this.authService.updateProfile(profileData).subscribe({
        next: (response) => {
          this.isSaving = false;
          if (response.success && response.user) {
            this.user = response.user;
            this.isEditMode = false;
            this.successMessage = 'Profile updated successfully!';
            setTimeout(() => this.successMessage = '', 3000);
          } else {
            this.errorMessage = response.message || 'Failed to update profile';
          }
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = error?.error?.message || 'Failed to update profile. Please try again.';
          console.error('Error updating profile:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      this.isSaving = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { oldPassword, newPassword } = this.passwordForm.value;
      
      this.authService.changePassword(oldPassword, newPassword).subscribe({
        next: (response) => {
          this.isSaving = false;
          if (response.success) {
            this.passwordForm.reset();
            this.successMessage = 'Password changed successfully!';
            setTimeout(() => this.successMessage = '', 3000);
          } else {
            this.errorMessage = response.message || 'Failed to change password';
          }
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = error?.error?.message || 'Failed to change password. Please try again.';
          console.error('Error changing password:', error);
        }
      });
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  switchTab(tab: 'profile' | 'password' | 'orders'): void {
    this.activeTab.set(tab);
    this.errorMessage = '';
    this.successMessage = '';
    
    if (tab === 'orders' && this.orders().length === 0) {
      this.loadOrders();
    }
  }

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.ordersError.set(null);

    if (!this.user) return;

    this.orderService.getCustomerOrders(this.user.id)
      .then((response) => {
        if (response.success && response.data) {
          this.orders.set(response.data);
        } else {
          this.ordersError.set(response.message || 'Failed to load orders');
        }
        this.ordersLoading.set(false);
      })
      .catch((error) => {
        console.error('Error loading orders:', error);
        this.ordersError.set('Failed to load orders');
        this.ordersLoading.set(false);
      });
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'bg-warning',
      'designing': 'bg-info',
      'ripping': 'bg-primary',
      'heatpress': 'bg-secondary',
      'cutting': 'bg-dark',
      'assembly': 'bg-success',
      'qc': 'bg-primary',
      'done': 'bg-success',
      'cancelled': 'bg-danger'
    };
    
    return statusClasses[status] || 'bg-secondary';
  }

  getStatusDisplayName(status: string): string {
    const statusNames: { [key: string]: string } = {
      'pending': 'Pending',
      'designing': 'Designing',
      'ripping': 'Ripping',
      'heatpress': 'Heat Press',
      'cutting': 'Cutting',
      'assembly': 'Assembly',
      'qc': 'Quality Check',
      'done': 'Completed',
      'cancelled': 'Cancelled'
    };
    
    return statusNames[status] || status;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isCustomer(): boolean {
    return this.user?.role === 'customer';
  }

  isEmployee(): boolean {
    return this.user?.role === 'employee';
  }
}
