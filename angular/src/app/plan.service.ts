import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  updatedAt: string;
  exerciseCount: number;
}

export interface Exercise {
  externalId: string;
  name: string;
  gifUrl: string;
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:8080/api/v1/plans';

  list(): Observable<Plan[]> { return this.http.get<Plan[]>(this.api); }
  create(name: string, description: string): Observable<Plan> {
    return this.http.post<Plan>(this.api, { name, description });
  }
  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.api}/${id}`);
  }
  searchExercises(name = ''): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${this.api.replace('/plans', '/exercises')}?name=${encodeURIComponent(name)}&limit=20`);
  }
}
