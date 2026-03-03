import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '../services/admin.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<AdminUser[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchEmail = signal('');

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.isLoading.set(true);
    this.error.set(null);

    this.adminService.getUsers().subscribe({
      next: (res) => {
        this.users.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load users');
        this.isLoading.set(false);
      }
    });
  }

  get filteredUsers(): AdminUser[] {
    const search = this.searchEmail().toLowerCase();
    if (!search) return this.users();
    return this.users().filter(u => u.email.toLowerCase().includes(search));
  }

  onRoleChange(user: AdminUser, newRole: string) {
    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: (updated) => {
        const idx = this.users().findIndex(u => u.id === user.id);
        if (idx >= 0) {
          const updated_users = this.users();
          updated_users[idx] = updated;
          this.users.set([...updated_users]);
        }
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to update role');
      }
    });
  }

  onStatusToggle(user: AdminUser) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    this.adminService.updateUserStatus(user.id, newStatus).subscribe({
      next: (updated) => {
        const idx = this.users().findIndex(u => u.id === user.id);
        if (idx >= 0) {
          const updated_users = this.users();
          updated_users[idx] = updated;
          this.users.set([...updated_users]);
        }
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to update status');
      }
    });
  }
}

