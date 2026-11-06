import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth';
import { CurrentUserService } from '../../../core/services/current-user-service';

@Component({
  selector: 'app-change-password',
  imports: [MatButtonModule, MatIconModule, MatInputModule, MatProgressBarModule],
  templateUrl: './change-password.html',
  styleUrls: ['../auth.css', '../auth.material.scss', './change-password.css'],
})
export default class ChangePassword {
  private authService = inject(AuthService);
  private currentUser = inject(CurrentUserService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  current = signal('');
  password = signal('');
  confirm = signal('');
  hideCurrent = signal(true);
  hideNew = signal(true);
  hideConfirm = signal(true);
  saving = signal(false);
  touched = signal(false);

  username = computed(() => this.currentUser.user()?.username ?? '');

  currentError = computed(() =>
    this.current() ? null : 'Escribe tu contraseña actual (la que te dio soporte)',
  );

  passwordError = computed(() => {
    const p = this.password();
    if (!p) return 'Escribe una contraseña';
    if (p.length < 6) return 'Debe tener al menos 6 caracteres';
    if (p === this.current()) return 'Debe ser distinta a la actual';
    return null;
  });

  confirmError = computed(() => {
    if (!this.confirm()) return 'Repite la contraseña';
    if (this.confirm() !== this.password()) return 'Las contraseñas no coinciden';
    return null;
  });

  valid = computed(() => !this.currentError() && !this.passwordError() && !this.confirmError());

  onInput(field: 'current' | 'password' | 'confirm', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    ({ current: this.current, password: this.password, confirm: this.confirm })[field].set(value);
  }

  save(event: SubmitEvent) {
    event.preventDefault();
    this.touched.set(true);
    if (!this.valid() || this.saving()) return;

    this.saving.set(true);
    this.authService.changeOwnPassword(this.current(), this.password()).subscribe({
      next: () => {
        this.saving.set(false);
        const user = this.currentUser.user();
        if (user) this.currentUser.user.set({ ...user, must_change_password: false });
        this.snackBar.open('Contraseña actualizada', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/panel']);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const msg = err.error?.message;
        this.snackBar.open(
          (Array.isArray(msg) ? msg.join(', ') : msg) || 'No se pudo cambiar la contraseña',
          'Cerrar',
          { duration: 5000 },
        );
      },
    });
  }

  logout() {
    this.currentUser.clearSession();
    this.router.navigate(['']);
  }
}
