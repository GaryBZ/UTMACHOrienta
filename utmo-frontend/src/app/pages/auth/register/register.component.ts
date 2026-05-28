import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

type FieldStatus = 'error' | 'success' | '';

type FieldKey =
  | 'nombre'
  | 'apellido'
  | 'ciudad'
  | 'colegio'
  | 'email'
  | 'password'
  | 'confirm';

interface FieldState {
  status: FieldStatus;
  message: string;
}

interface FieldStates {
  nombre: FieldState;
  apellido: FieldState;
  ciudad: FieldState;
  colegio: FieldState;
  email: FieldState;
  password: FieldState;
  confirm: FieldState;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [CommonModule, RouterLink]
})
export class RegisterComponent {
  step = 1;
  success = false;
  successEmail = '';
  showPassword = false;
  showConfirm = false;
  termsError = false;
  isSubmitting = false;
  errorMessage = '';

  form = {
    nombre: '',
    apellido: '',
    ciudad: '',
    colegio: '',
    email: '',
    password: '',
    confirm: '',
    terms: false
  };

  fieldStates: FieldStates = {
    nombre: { status: '', message: '' },
    apellido: { status: '', message: '' },
    ciudad: { status: '', message: '' },
    colegio: { status: '', message: '' },
    email: { status: '', message: '' },
    password: { status: '', message: '' },
    confirm: { status: '', message: '' }
  };

  strengthScore = 0;
  strengthLabel = '';
  strengthColor = 'var(--muted)';
  showStrength = false;

  constructor(private authService: AuthService) {}

  updateField(field: keyof typeof this.form, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this.form[field] = target.value as never;
    if (this.errorMessage) this.errorMessage = '';

    if (field === 'password') {
      this.checkStrength();
      if (this.form.confirm) {
        this.updateConfirmHint();
      }
    }

    if (field === 'confirm') {
      this.updateConfirmHint();
    }
  }

  toggleTerms(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.form.terms = target.checked;
    if (this.form.terms) this.termsError = false;
  }

  goStep2(): void {
    if (!this.validateStep1()) return;
    this.step = 2;
  }

  goStep1(): void {
    this.step = 1;
  }

  submitForm(): void {
    if (!this.validateStep2()) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService
      .register({
        nombre: this.form.nombre.trim(),
        apellido: this.form.apellido.trim(),
        email: this.form.email.trim(),
        password: this.form.password,
        colegio: this.form.colegio.trim(),
        ciudad: this.form.ciudad
      })
      .pipe(
        catchError((error) => {
          this.errorMessage = error?.error?.message || 'No se pudo crear la cuenta';
          return of(null);
        }),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe((user) => {
        if (!user) return;
        localStorage.setItem('utmo_user', JSON.stringify(user));
        this.successEmail = this.form.email.trim();
        this.success = true;
      });
  }

  togglePwd(which: 'password' | 'confirm'): void {
    if (which === 'password') {
      this.showPassword = !this.showPassword;
      return;
    }

    this.showConfirm = !this.showConfirm;
  }

  getStrengthClass(position: number): string {
    if (position > this.strengthScore) return '';
    if (this.strengthScore <= 1) return 'weak';
    if (this.strengthScore <= 3) return 'medium';
    return 'strong';
  }

  private setFieldState(field: FieldKey, status: FieldStatus, message = ''): void {
    this.fieldStates[field] = { status, message };
  }

  private validateStep1(): boolean {
    let valid = true;

    if (!this.form.nombre.trim()) {
      this.setFieldState('nombre', 'error', 'El nombre es requerido');
      valid = false;
    } else {
      this.setFieldState('nombre', 'success');
    }

    if (!this.form.apellido.trim()) {
      this.setFieldState('apellido', 'error', 'El apellido es requerido');
      valid = false;
    } else {
      this.setFieldState('apellido', 'success');
    }

    if (!this.form.ciudad) {
      this.setFieldState('ciudad', 'error', 'Selecciona tu ciudad');
      valid = false;
    } else {
      this.setFieldState('ciudad', 'success');
    }

    if (!this.form.colegio.trim()) {
      this.setFieldState('colegio', 'error', 'Ingresa tu institucion educativa');
      valid = false;
    } else {
      this.setFieldState('colegio', 'success');
    }

    return valid;
  }

  private validateStep2(): boolean {
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
    } else if (this.form.password.length < 8) {
      this.setFieldState('password', 'error', 'Minimo 8 caracteres');
      valid = false;
    } else {
      this.setFieldState('password', 'success');
    }

    if (!this.form.confirm) {
      this.setFieldState('confirm', 'error', 'Confirma tu contrasena');
      valid = false;
    } else if (this.form.password !== this.form.confirm) {
      this.setFieldState('confirm', 'error', 'Las contrasenas no coinciden');
      valid = false;
    } else {
      this.setFieldState('confirm', 'success');
    }

    this.termsError = !this.form.terms;
    if (this.termsError) valid = false;

    return valid;
  }

  private updateConfirmHint(): void {
    if (!this.form.confirm) {
      this.setFieldState('confirm', '', '');
      return;
    }

    if (this.form.password === this.form.confirm) {
      this.setFieldState('confirm', 'success', 'Las contrasenas coinciden');
    } else {
      this.setFieldState('confirm', 'error', 'Las contrasenas no coinciden');
    }
  }

  private checkStrength(): void {
    const pwd = this.form.password;
    if (!pwd.length) {
      this.showStrength = false;
      this.strengthScore = 0;
      this.strengthLabel = '';
      this.strengthColor = 'var(--muted)';
      return;
    }

    this.showStrength = true;
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    this.strengthScore = score;
    const labels = ['', 'Debil', 'Regular', 'Buena', 'Fuerte'];
    this.strengthLabel = labels[score];
    if (score <= 1) this.strengthColor = 'var(--red)';
    else if (score <= 2) this.strengthColor = '#e07b2a';
    else this.strengthColor = 'var(--green)';
  }
}
