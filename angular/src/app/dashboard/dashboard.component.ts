import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth.service';
import { Exercise, Plan, PlanExercise, PlanService } from '../plan.service';

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
  selectedMuscle = '';
  selectedBodyPart = '';
  muscles: string[] = [];
  bodyParts: string[] = [];
  exercisesLoading = false;
  selectedPlan: Plan | null = null;
  planExercises: PlanExercise[] = [];
  exerciseToAdd: Exercise | null = null;
  exerciseNote = '';
  exerciseSets: number | null = null;
  exerciseReps: number | null = null;
  exerciseWeight: number | null = null;
  editingExerciseId: number | null = null;
  editingNote = '';
  editingSets: number | null = null;
  editingReps: number | null = null;
  editingWeight: number | null = null;
  editingPlan: Plan | null = null;
  editPlanName = '';
  editPlanDescription = '';
  deletePassword = '';

  readonly planForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    description: ['Kraft']
  });

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
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

  selectPlan(plan: Plan): void {
    this.plansApi.get(plan.id).subscribe({
      next: (loadedPlan) => this.selectedPlan = { ...loadedPlan, exerciseCount: plan.exerciseCount },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsplan konnte nicht geladen werden.')
    });
    this.selectedPlan = plan;
    this.planExercises = [];
    this.error = '';
    this.plansApi.listExercises(plan.id).subscribe({
      next: (exercises) => this.planExercises = exercises,
      error: (error: unknown) => this.error = this.apiMessage(error, 'Planübungen konnten nicht geladen werden.')
    });
  }

  startEditingPlan(plan: Plan): void {
    this.editingPlan = plan;
    this.editPlanName = plan.name;
    this.editPlanDescription = plan.description || '';
  }

  savePlan(): void {
    if (!this.editingPlan || !this.editPlanName.trim()) return;
    this.plansApi.update(this.editingPlan.id, this.editPlanName.trim(), this.editPlanDescription.trim()).subscribe({
      next: (updated) => {
        const plan = { ...updated, exerciseCount: this.editingPlan!.exerciseCount };
        this.plans = this.plans.map((item) => item.id === plan.id ? plan : item);
        if (this.selectedPlan?.id === plan.id) this.selectedPlan = plan;
        this.editingPlan = null;
        this.message = 'Trainingsplan aktualisiert.';
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsplan konnte nicht aktualisiert werden.')
    });
  }

  chooseExercise(exercise: Exercise): void {
    this.exerciseToAdd = exercise;
    this.exerciseNote = '';
    this.exerciseSets = null;
    this.exerciseReps = null;
    this.exerciseWeight = null;
  }

  selectPlanById(planId: string): void {
    const plan = this.plans.find((item) => item.id === Number(planId));
    if (plan) this.selectPlan(plan);
  }

  addExercise(): void {
    if (!this.selectedPlan || !this.exerciseToAdd) return;
    this.plansApi.addExercise(
      this.selectedPlan.id,
      this.exerciseToAdd.externalId,
      this.exerciseNote,
      this.exerciseSets,
      this.exerciseReps,
      this.exerciseWeight
    ).subscribe({
      next: (exercise) => {
        this.planExercises = [...this.planExercises, exercise];
        this.updatePlanCount(this.selectedPlan!.id, this.planExercises.length);
        this.exerciseToAdd = null;
        this.exerciseNote = '';
        this.exerciseSets = null;
        this.exerciseReps = null;
        this.exerciseWeight = null;
        this.message = 'Übung zum Plan hinzugefügt.';
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Übung konnte nicht hinzugefügt werden.')
    });
  }

  startEditingExercise(exercise: PlanExercise): void {
    this.editingExerciseId = exercise.id;
    this.editingNote = exercise.note || '';
    this.editingSets = exercise.sets;
    this.editingReps = exercise.reps;
    this.editingWeight = exercise.weight;
  }

  saveExercise(exercise: PlanExercise): void {
    if (!this.selectedPlan) return;
    this.plansApi.updateExercise(
      this.selectedPlan.id,
      exercise.id,
      this.editingNote,
      this.editingSets,
      this.editingReps,
      this.editingWeight
    ).subscribe({
      next: (updated) => {
        this.planExercises = this.planExercises.map((item) => item.id === updated.id ? updated : item);
        this.editingExerciseId = null;
        this.message = 'Trainingsdaten gespeichert.';
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsdaten konnten nicht gespeichert werden.')
    });
  }

  deleteExercise(exercise: PlanExercise): void {
    if (!this.selectedPlan || !confirm(`„${exercise.name}“ aus dem Plan entfernen?`)) return;
    this.plansApi.deleteExercise(this.selectedPlan.id, exercise.id).subscribe({
      next: () => {
        this.planExercises = this.planExercises
          .filter((item) => item.id !== exercise.id)
          .map((item, index) => ({ ...item, position: index + 1 }));
        this.updatePlanCount(this.selectedPlan!.id, this.planExercises.length);
        this.message = 'Übung aus dem Plan entfernt.';
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Übung konnte nicht entfernt werden.')
    });
  }

  private updatePlanCount(planId: number, exerciseCount: number): void {
    this.plans = this.plans.map((plan) => plan.id === planId ? { ...plan, exerciseCount } : plan);
    if (this.selectedPlan?.id === planId) {
      this.selectedPlan = { ...this.selectedPlan, exerciseCount };
    }
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
    if (view === 'exercises' && !this.exercises.length) {
      this.loadExerciseFilters();
      this.loadExercises();
    }
  }

  loadExercises(): void {
    this.exercisesLoading = true;
    const muscles = this.selectedMuscle ? [this.selectedMuscle] : [];
    this.plansApi.searchExercises(this.exerciseSearch, muscles).subscribe({
      next: (result) => {
        this.exercises = this.selectedBodyPart
          ? result.exercises.filter((exercise) => exercise.bodyParts?.includes(this.selectedBodyPart))
          : result.exercises;
        this.exercisesLoading = false;
      },
      error: (error: unknown) => {
        this.error = this.apiMessage(error, 'Übungen konnten nicht geladen werden.');
        this.exercisesLoading = false;
      }
    });
  }

  loadExerciseFilters(): void {
    this.plansApi.muscles().subscribe({
      next: (muscles) => this.muscles = muscles,
      error: (error: unknown) => this.error = this.apiMessage(error, 'Muskelgruppen konnten nicht geladen werden.')
    });
    this.plansApi.bodyParts().subscribe({
      next: (bodyParts) => this.bodyParts = bodyParts,
      error: (error: unknown) => this.error = this.apiMessage(error, 'Körperbereiche konnten nicht geladen werden.')
    });
  }

  exportUserData(): void {
    this.auth.exportUserData().subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'capsule-gym-daten.json';
        link.click();
        URL.revokeObjectURL(url);
        this.message = 'Deine Daten wurden exportiert.';
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Daten konnten nicht exportiert werden.')
    });
  }

  deleteAccount(): void {
    if (!this.deletePassword || !confirm('Möchtest du dein Konto wirklich dauerhaft löschen?')) return;
    this.auth.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.auth.clearSession();
        this.router.navigateByUrl('/auth');
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Konto konnte nicht gelöscht werden.')
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
