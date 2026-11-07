import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './config';

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
    return this.http.delete(`${this.api}/auth`);
  }
}
