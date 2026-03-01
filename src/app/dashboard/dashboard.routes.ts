import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/usage-dashboard.component').then(m => m.UsageDashboardComponent)
  }
];
