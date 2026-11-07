import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from './config';

export interface LoginResponse {
  message: string;
  token?: string;
}

export interface User {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface UserExport {
  user: User;
  plans: unknown[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = API_URL;

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth`, { email, password });
  }

  register(username: string, email: string, password: string): Observable<unknown> {
    return this.http.post(`${this.api}/users`, { username, email, password });
  }

  currentUser(): Observable<User> {
    return this.http.get<User>(`${this.api}/users/me`);
  }
  exportUserData(): Observable<UserExport> {
    return this.http.get<UserExport>(`${this.api}/users/me/export`);
  }
  deleteAccount(password: string): Observable<unknown> {
    return this.http.delete(`${this.api}/users/me`, { body: { password } });
  }

  logout(): Observable<unknown> {
    return this.http.delete(`${this.api}/auth`).pipe(
      tap(() => this.clearSession())
    );
  }

  clearSession(): void {
    // Authentication is stored in an HttpOnly cookie and cannot be read by JavaScript.
  }
}
