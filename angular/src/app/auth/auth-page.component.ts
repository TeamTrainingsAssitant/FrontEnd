import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html'
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  mode: 'login' | 'register' = 'login';
  error = '';
  message = '';

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required]
  });
  readonly registerForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmation: ['', Validators.required]
  });

  constructor() {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') {
      this.mode = 'register';
    }
  }

  login(): void {
    const { email, password } = this.loginForm.getRawValue();
    if (this.loginForm.invalid) return;
    this.error = '';
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (error: unknown) => this.error = this.apiMessage(error, 'Login fehlgeschlagen.')
    });
  }

  register(): void {
    const values = this.registerForm.getRawValue();
    if (this.registerForm.invalid) return;
    if (values.password !== values.confirmation) {
      this.error = 'Die Passwörter stimmen nicht überein.';
      return;
    }
    this.auth.register(values.username, values.email, values.password).subscribe({
      next: () => {
        this.mode = 'login';
        this.loginForm.patchValue({ email: values.email, password: '' });
        this.registerForm.reset();
        this.message = 'Registrierung erfolgreich. Du kannst dich jetzt einloggen.';
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Registrierung fehlgeschlagen.')
    });
  }

  private apiMessage(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string }; message?: string };
    const message = candidate.error?.message || candidate.message || fallback;
    return ({
      'Password wrong.': 'E-Mail oder Passwort ist falsch.',
      'Email already registered.': 'Diese E-Mail-Adresse ist bereits registriert.',
      'Not authenticated.': 'Die Anmeldung ist abgelaufen. Bitte erneut einloggen.'
    } as Record<string, string>)[message] || message;
  }
}
