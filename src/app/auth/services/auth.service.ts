import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { tap, catchError, switchMap, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse 
} from '@shared/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenRefreshTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Start token refresh timer if user is logged in
    if (this.isAuthenticated()) {
      this.scheduleTokenRefresh();
    }
  }

  // ──────────────────────────────────────────────────────────
  // Authentication Methods
  // ──────────────────────────────────────────────────────────

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${environment.apiUrl}/auth/login`,
      credentials
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  register(data: RegisterRequest): Observable<{ message: string; userId: string }> {
    return this.http.post<{ message: string; userId: string }>(
      `${environment.apiUrl}/auth/register`,
      data
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(
      tap(() => this.handleLogout()),
      catchError(error => {
        // Logout locally even if API call fails
        this.handleLogout();
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<{ accessToken: string; expiresIn: number }> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<{ accessToken: string; expiresIn: number }>(
      `${environment.apiUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => {
        this.setAccessToken(response.accessToken);
        this.scheduleTokenRefresh();
      }),
      catchError(error => {
        this.handleLogout();
        return throwError(() => error);
      }),
      shareReplay(1) // Prevent multiple simultaneous refresh calls
    );
  }

  // ──────────────────────────────────────────────────────────
  // Token Management
  // ──────────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private setAccessToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────
  // Helper Methods
  // ──────────────────────────────────────────────────────────

  private handleAuthSuccess(response: AuthResponse): void {
    this.setAccessToken(response.accessToken);
    this.setRefreshToken(response.refreshToken);
    this.setUser(response.user);
    this.scheduleTokenRefresh();
  }

  private handleLogout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    this.router.navigate(['/auth/login']);
  }

  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Schedule refresh 5 minutes before token expires
    const delay = environment.tokenRefreshThreshold;
    
    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken().subscribe({
        next: () => console.log('Token refreshed successfully'),
        error: (error) => console.error('Token refresh failed:', error)
      });
    }, delay);
  }

  // ──────────────────────────────────────────────────────────
  // Role-Based Access Control
  // ──────────────────────────────────────────────────────────

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  isAdmin(): boolean {
    return this.hasAnyRole(['admin', 'superadmin']);
  }

  isSuperAdmin(): boolean {
    return this.hasRole('superadmin');
  }
}
