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

export interface PlanExercise extends Exercise {
  id: number;
  position: number;
  note: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly api = 'https://trainingsapp-dd913c63a7fd.herokuapp.com/api/v1/plans';

  list(): Observable<Plan[]> { return this.http.get<Plan[]>(this.api); }
  create(name: string, description: string): Observable<Plan> {
    return this.http.post<Plan>(this.api, { name, description });
  }
  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.api}/${id}`);
  }
  listExercises(planId: number): Observable<PlanExercise[]> {
    return this.http.get<PlanExercise[]>(`${this.api}/${planId}/exercises`);
  }
  addExercise(planId: number, externalId: string, note: string): Observable<PlanExercise> {
    return this.http.post<PlanExercise>(`${this.api}/${planId}/exercises`, { externalId, note: note || null });
  }
  updateExercise(planId: number, exerciseId: number, note: string): Observable<PlanExercise> {
    return this.http.put<PlanExercise>(`${this.api}/${planId}/exercises/${exerciseId}`, { note: note || null });
  }
  deleteExercise(planId: number, exerciseId: number): Observable<unknown> {
    return this.http.delete(`${this.api}/${planId}/exercises/${exerciseId}`);
  }
  searchExercises(name = ''): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${this.api.replace('/plans', '/exercises')}?name=${encodeURIComponent(name)}&limit=20`);
  }
}
