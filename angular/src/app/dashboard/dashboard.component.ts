import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth.service';
import { Exercise, Plan, PlanService } from '../plan.service';

type View = 'overview' | 'plans' | 'create' | 'exercises' | 'profile';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly plansApi = inject(PlanService);

  view: View = 'overview';
  menuOpen = false;
  plans: Plan[] = [];
  user: User | null = null;
  error = '';
  message = '';
  exercises: Exercise[] = [];
  exerciseSearch = '';
  exercisesLoading = false;

  readonly planForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    description: ['Kraft']
  });

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    if (this.auth.token === this.auth.localAdminToken) {
      this.user = { userId: 0, username: 'admin', email: 'admin', createdAt: '' };
      return;
    }
    this.auth.currentUser().subscribe({
      next: (user) => this.user = user,
      error: (error: unknown) => this.error = this.apiMessage(error, 'Profil konnte nicht geladen werden.')
    });
    this.loadPlans();
  }

  loadPlans(): void {
    this.plansApi.list().subscribe({
      next: (plans) => this.plans = plans,
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingspläne konnten nicht geladen werden.')
    });
  }

  createPlan(): void {
    if (this.planForm.invalid) return;
    const values = this.planForm.getRawValue();
    this.plansApi.create(values.name, values.description).subscribe({
      next: (plan) => {
        this.plans = [plan, ...this.plans];
        this.planForm.reset({ name: '', description: 'Kraft' });
        this.view = 'plans';
        this.message = 'Trainingsplan gespeichert.';
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsplan konnte nicht gespeichert werden.')
    });
  }

  deletePlan(plan: Plan): void {
    if (!confirm(`Möchtest du „${plan.name}“ wirklich löschen?`)) return;
    this.plansApi.delete(plan.id).subscribe({
      next: () => this.plans = this.plans.filter((item) => item.id !== plan.id),
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsplan konnte nicht gelöscht werden.')
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth'),
      error: () => {
        this.auth.clearSession();
        this.router.navigateByUrl('/auth');
      }
    });
  }

  selectView(view: View): void {
    this.view = view;
    this.menuOpen = false;
    this.error = '';
    this.message = '';
    if (view === 'exercises' && !this.exercises.length) this.loadExercises();
  }

  loadExercises(): void {
    this.exercisesLoading = true;
    this.plansApi.searchExercises(this.exerciseSearch).subscribe({
      next: (exercises) => {
        this.exercises = exercises;
        this.exercisesLoading = false;
      },
      error: (error: unknown) => {
        this.error = this.apiMessage(error, 'Übungen konnten nicht geladen werden.');
        this.exercisesLoading = false;
      }
    });
  }

  private apiMessage(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string }; message?: string };
    const message = candidate.error?.message || candidate.message || fallback;
    return ({
      'Not authenticated.': 'Die Anmeldung ist abgelaufen. Bitte erneut einloggen.',
      'Plan not found.': 'Trainingsplan nicht gefunden.'
    } as Record<string, string>)[message] || message;
  }
}
