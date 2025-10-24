import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private cdr: ChangeDetectorRef // ✅ Added
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all fields correctly';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success && response.user) {
          // ✅ Refresh cart after successful login
          this.cartService.refreshCart();

          // ✅ Redirect based on user role
          if (response.user.role === 'customer') {
            this.router.navigate(['/apparel']);
          } else if (response.user.role === 'employee') {
            this.router.navigate(['/admin']);
          }
        } else {
          this.errorMessage = response.message || 'Login failed';
        }

        // ✅ Force view update (Angular sometimes misses it)
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error.error?.message || 'Login failed. Please try again.';

        // ✅ Force view update in case Angular doesn’t detect it automatically
        this.cdr.detectChanges();
      }
    });
  }

  // Getters for cleaner template bindings
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
