import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  signupForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[\d\s\+\-\(\)]+$/)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      city: ['', [Validators.required]],
      province: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      country: ['Philippines', [Validators.required]],
      dateOfBirth: [''],
      emergencyContactName: [''],
      emergencyContactPhone: ['', [Validators.pattern(/^[\d\s\+\-\(\)]+$/)]],
      preferredContactMethod: ['email', [Validators.required]],
      marketingConsent: [false],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      this.markFormGroupTouched(this.signupForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { fullName, email, phone, address, city, province, postalCode, country, 
            dateOfBirth, emergencyContactName, emergencyContactPhone, 
            preferredContactMethod, marketingConsent, password } = this.signupForm.value;

    this.authService.register(email, password, fullName, phone, address, city, 
                              province, postalCode, country, dateOfBirth, 
                              emergencyContactName, emergencyContactPhone, 
                              preferredContactMethod, marketingConsent).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = 'Account created successfully! Redirecting...';
          // Auto-login and redirect to apparel page
          setTimeout(() => {
            this.router.navigate(['/apparel']);
          }, 1500);
        } else {
          this.errorMessage = response.message || 'Registration failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  // Mark all form controls as touched to show validation errors
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Getter methods for form controls
  get fullName() { return this.signupForm.get('fullName'); }
  get email() { return this.signupForm.get('email'); }
  get phone() { return this.signupForm.get('phone'); }
  get address() { return this.signupForm.get('address'); }
  get city() { return this.signupForm.get('city'); }
  get province() { return this.signupForm.get('province'); }
  get postalCode() { return this.signupForm.get('postalCode'); }
  get country() { return this.signupForm.get('country'); }
  get dateOfBirth() { return this.signupForm.get('dateOfBirth'); }
  get emergencyContactName() { return this.signupForm.get('emergencyContactName'); }
  get emergencyContactPhone() { return this.signupForm.get('emergencyContactPhone'); }
  get preferredContactMethod() { return this.signupForm.get('preferredContactMethod'); }
  get marketingConsent() { return this.signupForm.get('marketingConsent'); }
  get password() { return this.signupForm.get('password'); }
  get confirmPassword() { return this.signupForm.get('confirmPassword'); }
}
