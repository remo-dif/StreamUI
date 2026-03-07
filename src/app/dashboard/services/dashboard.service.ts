import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface UsageDashboardResponse {
  quota: { total: number; used: number; percentage: number };
  today: { tokens: number };
  last30Days: { tokens: number; requestCount: number };
  dailyBreakdown: { date: string; tokens: number }[]; // adjust as API returns
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getDashboard(): Observable<UsageDashboardResponse> {
    return this.http.get<UsageDashboardResponse>(
      `${environment.apiUrl}/usage/dashboard`
    );
  }
}
