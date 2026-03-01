import { Routes } from '@angular/router';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/chat-container/chat-container.component').then(m => m.ChatContainerComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/chat-container/chat-container.component').then(m => m.ChatContainerComponent)
  }
];
