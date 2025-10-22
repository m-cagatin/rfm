import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { SignupComponent } from './components/signup/signup';
import { ApparelComponent } from './components/apparel/apparel';
import { CustomizationComponent } from './components/customization/customization';
import { CartComponent } from './components/cart/cart';
import { CheckoutComponent } from './components/checkout/checkout';
import { OrderHistoryComponent } from './components/order-history/order-history';
import { LandingPageComponent } from './components/landing-page/landing-page';
import { AccountSettingsComponent } from './components/account-settings/account-settings';

// Admin Components
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout';
import { AdminDashboardComponent } from './components/admin/dashboard/dashboard';
import { AdminOrdersComponent } from './components/admin/orders/orders';
import { AdminProductsComponent } from './components/admin/products/products';
import { AdminMockupsComponent } from './components/admin/mockups/mockups';
import { AdminCashflowComponent } from './components/admin/cashflow/cashflow';
import { AdminReportsComponent } from './components/admin/reports/reports';
import { AdminEmployeesComponent } from './components/admin/employees/employees';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { GuestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [GuestGuard] },
  
  // Customer routes (optional auth)
  { path: 'apparel', component: ApparelComponent },
  { path: 'customization', component: CustomizationComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard] },
  { path: 'orders', component: OrderHistoryComponent, canActivate: [AuthGuard] },
  
  // Protected user profile route
  { 
    path: 'account-settings', 
    component: AccountSettingsComponent,
    canActivate: [AuthGuard]
  },
  
  // Admin Routes (protected with auth + admin guards)
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard, AdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'products', component: AdminProductsComponent },
      { path: 'employees', component: AdminEmployeesComponent },
      { path: 'mockups', component: AdminMockupsComponent },
      { path: 'cashflow', component: AdminCashflowComponent },
      { path: 'reports', component: AdminReportsComponent }
    ]
  },
  
  { path: '**', redirectTo: '' } // Wildcard route for 404 page
];
