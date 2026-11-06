import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, AdminUser } from '../../services/admin-service';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatMenuModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export default class AdminUsers implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  error = signal(false);
  busyId = signal<number | null>(null);
  users = signal<AdminUser[]>([]);
  query = signal('');
  resetResult = signal<{ username: string; password: string } | null>(null);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.users();
    if (!q) return list;
    return list.filter(
      (u) => u.username.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
    );
  });

  activeCount = computed(() => this.users().filter((u) => u.is_active).length);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) return this.logout();
        this.error.set(true);
      },
    });
  }

  onSearch(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
  }

  resetPassword(user: AdminUser) {
    const ok = window.confirm(
      `¿Restablecer la contraseña de "${user.username}"? Su contraseña actual dejará de funcionar.`,
    );
    if (!ok) return;
    this.busyId.set(user.id);
    this.adminService.resetUserPassword(user.id).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.resetResult.set(res);
      },
      error: (err: HttpErrorResponse) => this.fail(err, 'No se pudo restablecer la contraseña'),
    });
  }

  copyPassword() {
    const res = this.resetResult();
    if (!res) return;
    navigator.clipboard?.writeText(res.password).then(
      () => this.snackBar.open('Contraseña copiada', 'OK', { duration: 2500 }),
      () => {},
    );
  }

  toggleActive(user: AdminUser) {
    const activar = !user.is_active;
    if (!activar) {
      const ok = window.confirm(
        `¿Desactivar a "${user.username}"? No podrá iniciar sesión hasta que lo vuelvas a activar. Sus solicitudes se conservan.`,
      );
      if (!ok) return;
    }
    this.busyId.set(user.id);
    this.adminService.setUserActive(user.id, activar).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.users.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, is_active: res.is_active } : u)),
        );
        this.snackBar.open(
          res.is_active ? `${user.username} activado` : `${user.username} desactivado`,
          'OK',
          { duration: 2500 },
        );
      },
      error: (err: HttpErrorResponse) => this.fail(err, 'No se pudo cambiar el estado'),
    });
  }

  deleteUser(user: AdminUser) {
    if (user.ticket_count > 0) {
      this.snackBar.open(
        'Este usuario tiene solicitudes registradas. Desactívalo en lugar de eliminarlo.',
        'OK',
        { duration: 5000 },
      );
      return;
    }
    const ok = window.confirm(
      `¿Eliminar definitivamente la cuenta "${user.username}"? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    this.busyId.set(user.id);
    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        this.snackBar.open(`Cuenta "${user.username}" eliminada`, 'OK', { duration: 2500 });
      },
      error: (err: HttpErrorResponse) => this.fail(err, 'No se pudo eliminar la cuenta'),
    });
  }

  private fail(err: HttpErrorResponse, fallback: string) {
    this.busyId.set(null);
    if (err.status === 401) return this.logout();
    const msg = (err.error && (err.error.message as string)) || fallback;
    this.snackBar.open(Array.isArray(msg) ? msg.join(', ') : msg, 'OK', { duration: 5000 });
  }

  back() {
    this.router.navigate(['/admin/board']);
  }

  logout() {
    localStorage.removeItem('admin_key');
    this.router.navigate(['/admin/verify']);
  }
}
