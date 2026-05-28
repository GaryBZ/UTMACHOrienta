import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

type FieldStatus = 'error' | 'success' | '';

interface FieldState {
  status: FieldStatus;
  message: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [CommonModule, RouterLink]
})
export class LoginComponent {
  success = false;
  showPassword = false;
  isSubmitting = false;
  errorMessage = '';

  form = {
    email: '',
    password: '',
    remember: false
  };

  fieldStates: { email: FieldState; password: FieldState } = {
    email: { status: '', message: '' },
    password: { status: '', message: '' }
  };

  constructor(private authService: AuthService, private router: Router) {}

  updateField(field: keyof typeof this.form, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.form[field] = target.value as never;
    if (this.errorMessage) this.errorMessage = '';
  }

  toggleRemember(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.form.remember = target.checked;
  }

  togglePwd(): void {
    this.showPassword = !this.showPassword;
  }

  submitForm(): void {
    if (!this.validateForm()) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService
      .login({
        email: this.form.email.trim(),
        password: this.form.password
      })
      .pipe(
        catchError((error) => {
          this.errorMessage = error?.error?.message || 'No se pudo iniciar sesion';
          return of(null);
        }),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe((user) => {
        if (!user) return;
        localStorage.setItem('utmo_user', JSON.stringify(user));
        this.success = true;
        this.router.navigate(['/inicio']);
      });
  }

  exploreAsGuest(): void {
    localStorage.removeItem('utmo_user');
    this.router.navigate(['/inicio']);
  }

  private setFieldState(field: 'email' | 'password', status: FieldStatus, message = ''): void {
    this.fieldStates[field] = { status, message };
  }

  private validateForm(): boolean {
    let valid = true;

    const email = this.form.email.trim();
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      this.setFieldState('email', 'error', 'El correo es requerido');
      valid = false;
    } else if (!emailRx.test(email)) {
      this.setFieldState('email', 'error', 'Ingresa un correo valido');
      valid = false;
    } else {
      this.setFieldState('email', 'success');
    }

    if (!this.form.password) {
      this.setFieldState('password', 'error', 'La contrasena es requerida');
      valid = false;
    } else if (this.form.password.length < 6) {
      this.setFieldState('password', 'error', 'Minimo 6 caracteres');
      valid = false;
    } else {
      this.setFieldState('password', 'success');
    }

    return valid;
  }
}
