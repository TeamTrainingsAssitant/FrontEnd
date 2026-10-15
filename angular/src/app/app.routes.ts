import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthPageComponent } from './auth/auth-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'auth', component: AuthPageComponent },
  { path: '**', redirectTo: '' }
];
