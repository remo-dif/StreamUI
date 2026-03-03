import { Component, inject, signal, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, UsageDashboardResponse } from '../services/dashboard.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js modules
Chart.register(...registerables);

@Component({
  selector: 'app-usage-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usage-dashboard.component.html',
  styleUrls: ['./usage-dashboard.component.scss']
})
export class UsageDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  data = signal<UsageDashboardResponse | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  @ViewChild('dailyChart', { static: false }) dailyChart!: ElementRef<HTMLCanvasElement>;

  ngOnInit() {
    this.loadDashboard();
  }

  private loadDashboard() {
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        this.isLoading.set(false);
        // give time for view to render canvas
        setTimeout(() => this.renderChart());
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load usage data');
        this.isLoading.set(false);
      }
    });
  }

  private renderChart() {
    const payload = this.data();
    if (!payload || !this.dailyChart) {
      return;
    }

    const ctx = this.dailyChart.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const labels = payload.dailyBreakdown.map(d => d.date);
    const tokens = payload.dailyBreakdown.map(d => d.tokens);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Tokens used',
            data: tokens,
            backgroundColor: '#1976d2'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    } as ChartConfiguration);
  }
}
