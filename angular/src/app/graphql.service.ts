import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { GRAPHQL_URL } from './config';

interface GraphqlResponse<T> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
}

// Fehler aus dem Gateway. message ist die Meldung des Backends (z. B. "Not authenticated."),
// damit apiMessage() im Dashboard sie wie bei REST übersetzen kann.
export class GraphqlError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private readonly http = inject(HttpClient);

  // Der Bearer-Token wird vom authInterceptor angehängt, das Gateway reicht ihn ans Backend weiter.
  request<T>(query: string, variables: Record<string, unknown> = {}): Observable<T> {
    return this.http.post<GraphqlResponse<T>>(GRAPHQL_URL, { query, variables }).pipe(
      map((response) => {
        // GraphQL antwortet auch bei Fehlern mit HTTP 200 und legt sie in "errors" ab
        const first = response.errors?.[0];
        if (first) throw new GraphqlError(first.message, first.extensions?.code);
        return response.data as T;
      })
    );
  }
}
