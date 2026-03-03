import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(
      `${environment.apiUrl}/admin/users`
    );
  }

  updateUserRole(userId: string, role: string): Observable<AdminUser> {
    return this.http.patch<AdminUser>(
      `${environment.apiUrl}/admin/users/${userId}/role`,
      { role }
    );
  }

  updateUserStatus(userId: string, status: string): Observable<AdminUser> {
    return this.http.patch<AdminUser>(
      `${environment.apiUrl}/admin/users/${userId}/status`,
      { status }
    );
  }
}
