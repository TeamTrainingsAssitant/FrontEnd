import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.currentUser().pipe(
    map(() => true),
    catchError(() => {
      window.location.assign('/login');
      return of(false);
    })
  );
};
