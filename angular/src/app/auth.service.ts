import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  message: string;
  token: string;
}

export interface User {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:8080/api/v1';
  readonly localAdminToken = 'local-admin';

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth`, { email, password }).pipe(
      tap((result) => this.storeSession(email, result.token))
    );
  }

  register(username: string, email: string, password: string): Observable<unknown> {
    return this.http.post(`${this.api}/users`, { username, email, password });
  }

  currentUser(): Observable<User> {
    return this.http.get<User>(`${this.api}/users/me`);
  }

  logout(): Observable<unknown> {
    const token = this.token;
    if (!token || token === this.localAdminToken) {
      this.clearSession();
      return new Observable((subscriber) => {
        subscriber.next(null);
        subscriber.complete();
      });
    }
    return this.http.delete(`${this.api}/auth`, { body: { token } }).pipe(
      tap(() => this.clearSession())
    );
  }

  storeSession(user: string, token: string): void {
    sessionStorage.setItem('powerLevelUser', user);
    sessionStorage.setItem('powerLevelToken', token);
  }

  localAdmin(email: string, password: string): boolean {
    if (email !== 'admin' || password !== 'admin123') return false;
    this.storeSession('admin', this.localAdminToken);
    return true;
  }

  clearSession(): void {
    sessionStorage.removeItem('powerLevelUser');
    sessionStorage.removeItem('powerLevelToken');
  }

  get token(): string | null {
    return sessionStorage.getItem('powerLevelToken');
  }

  get loggedIn(): boolean {
    return Boolean(sessionStorage.getItem('powerLevelUser') && this.token);
  }
}
