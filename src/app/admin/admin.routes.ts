import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/admin-panel.component').then(m => m.AdminPanelComponent)
  }
];
