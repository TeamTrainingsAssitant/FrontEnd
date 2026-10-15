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

export interface PlanDetails {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  externalId: string;
  name: string;
  gifUrl: string;
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
  bodyParts?: string[];
  equipments?: string[];
}

export interface ExerciseDetails extends Exercise {
  bodyParts: string[];
  equipments: string[];
  instructions: string[];
}

export interface PlanExercise extends Exercise {
  id: number;
  position: number;
  note: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly rootApi = 'https://trainingsapp-dd913c63a7fd.herokuapp.com/api/v1';
  private readonly api = `${this.rootApi}/plans`;

  list(): Observable<Plan[]> { return this.http.get<Plan[]>(this.api); }
  create(name: string, description: string): Observable<Plan> {
    return this.http.post<Plan>(this.api, { name, description });
  }
  get(id: number): Observable<PlanDetails> {
    return this.http.get<PlanDetails>(`${this.api}/${id}`);
  }
  update(id: number, name: string, description: string): Observable<Plan> {
    return this.http.put<Plan>(`${this.api}/${id}`, { name, description });
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
  searchExercises(name = '', muscles: string[] = [], offset = 0): Observable<{ total: number; exercises: Exercise[] }> {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    muscles.forEach((muscle) => params.append('muscles', muscle));
    params.set('offset', String(offset));
    params.set('limit', '20');
    return this.http.get<{ total: number; exercises: Exercise[] }>(`${this.rootApi}/exercisedb/exercises?${params}`);
  }
  getExercise(externalId: string): Observable<ExerciseDetails> {
    return this.http.get<ExerciseDetails>(`${this.rootApi}/exercisedb/exercises/${encodeURIComponent(externalId)}`);
  }
  muscles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.rootApi}/exercisedb/muscles`);
  }
  bodyParts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.rootApi}/exercisedb/bodyparts`);
  }
}
