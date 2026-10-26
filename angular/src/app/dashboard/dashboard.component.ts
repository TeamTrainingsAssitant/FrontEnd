import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth.service';
import { Exercise, Plan, PlanExercise, PlanService } from '../plan.service';

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

  profileOpen = false;
  plans: Plan[] = [];
  // Übungen je Plan für die Spalten im Board
  columnExercises: Record<number, PlanExercise[]> = {};
  // Plan, in den der "+"-Button in der Übungsleiste eine Übung legt
  targetPlanId: number | null = null;
  // Übung, deren Dialog gerade offen ist
  dialogExercise: PlanExercise | null = null;
  // Übung, die gerade aus der Übungsleiste gezogen wird
  draggedExercise: Exercise | null = null;
  // Plan, bei dem gerade die Lösch-Rückfrage angezeigt wird
  planToDelete: Plan | null = null;
  user: User | null = null;
  error = '';
  exercises: Exercise[] = [];
  exerciseSearch = '';
  selectedMuscle = '';
  muscles: string[] = [];
  exercisesLoading = false;
  selectedPlan: Plan | null = null;
  removingExercise: PlanExercise | null = null;
  alternativeExercises: Exercise[] = [];
  alternativesLoading = false;
  alternativeActionLoading = false;
  alternativesError = '';
  editingNote = '';
  editingSets: number | null = null;
  editingReps: number | null = null;
  editingWeight: number | null = null;
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
    this.loadExerciseFilters();
    this.loadExercises();
  }

  loadPlans(): void {
    this.plansApi.list().subscribe({
      next: (plans) => {
        this.plans = plans;
        plans.forEach((plan) => this.loadColumn(plan.id));
        if (!this.targetPlanId && plans.length) this.targetPlanId = plans[0].id;
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingspläne konnten nicht geladen werden.')
    });
  }

  loadColumn(planId: number): void {
    this.plansApi.listExercises(planId).subscribe({
      next: (exercises) => this.columnExercises[planId] = exercises,
      error: (error: unknown) => this.error = this.apiMessage(error, 'Planübungen konnten nicht geladen werden.')
    });
  }

  renamePlan(plan: Plan): void {
    const name = prompt('Neuer Name für den Trainingsplan:', plan.name);
    if (!name || !name.trim()) return;
    this.plansApi.update(plan.id, name.trim(), plan.description || '').subscribe({
      next: () => this.loadPlans(),
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsplan konnte nicht umbenannt werden.')
    });
  }

  addToTargetPlan(exercise: Exercise): void {
    if (!this.targetPlanId) {
      this.error = 'Lege zuerst einen Trainingsplan an.';
      return;
    }
    this.addExerciseToPlan(this.targetPlanId, exercise);
  }

  // Drag & Drop: Übung wurde auf eine Plan-Spalte fallen gelassen
  dropOnPlan(plan: Plan): void {
    if (!this.draggedExercise) return;
    this.addExerciseToPlan(plan.id, this.draggedExercise);
    this.draggedExercise = null;
  }

  addExerciseToPlan(planId: number, exercise: Exercise): void {
    this.plansApi.addExercise(planId, exercise.externalId, '', null, null, null).subscribe({
      next: () => {
        this.loadColumn(planId);
        const plan = this.plans.find((item) => item.id === planId);
        if (plan) this.updatePlanCount(planId, plan.exerciseCount + 1);
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Übung konnte nicht hinzugefügt werden.')
    });
  }

  openExercise(plan: Plan, exercise: PlanExercise): void {
    this.selectedPlan = plan;
    this.startEditingExercise(exercise);
    this.dialogExercise = exercise;
  }

  closeDialog(): void {
    this.dialogExercise = null;
    this.cancelExerciseRemoval();
  }

  // Kurzinfo unter einer Übung, z. B. "60 kg · 3 × 10"
  exerciseInfo(exercise: PlanExercise): string {
    const parts: string[] = [];
    if (exercise.weight !== null) parts.push(exercise.weight + ' kg');
    if (exercise.sets && exercise.reps) parts.push(exercise.sets + ' × ' + exercise.reps);
    return parts.join(' · ');
  }

  startEditingExercise(exercise: PlanExercise): void {
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
        this.loadColumn(this.selectedPlan!.id);
        this.closeDialog();
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsdaten konnten nicht gespeichert werden.')
    });
  }

  requestExerciseRemoval(exercise: PlanExercise): void {
    if (!this.selectedPlan) return;
    this.removingExercise = exercise;
    this.alternativeExercises = [];
    this.alternativesError = '';
    this.alternativesLoading = true;
    this.plansApi.alternatives(this.selectedPlan.id, exercise.id).subscribe({
      next: (alternatives) => {
        if (this.removingExercise?.id !== exercise.id) return;
        this.alternativeExercises = alternatives;
        this.alternativesLoading = false;
      },
      error: (error: unknown) => {
        if (this.removingExercise?.id !== exercise.id) return;
        this.alternativesLoading = false;
        this.alternativesError = this.apiMessage(error, 'Alternativen konnten nicht geladen werden.');
      }
    });
  }

  cancelExerciseRemoval(): void {
    this.removingExercise = null;
    this.alternativeExercises = [];
    this.alternativesLoading = false;
    this.alternativeActionLoading = false;
    this.alternativesError = '';
  }

  confirmExerciseRemoval(): void {
    if (!this.selectedPlan || !this.removingExercise) return;
    const exercise = this.removingExercise;
    this.alternativeActionLoading = true;
    this.plansApi.deleteExercise(this.selectedPlan.id, exercise.id).subscribe({
      next: () => {
        this.updatePlanCount(this.selectedPlan!.id, this.selectedPlan!.exerciseCount - 1);
        this.loadColumn(this.selectedPlan!.id);
        this.closeDialog();
      },
      error: (error: unknown) => {
        this.alternativeActionLoading = false;
        this.alternativesError = this.apiMessage(error, 'Übung konnte nicht entfernt werden.');
      }
    });
  }

  replaceExerciseWith(alternative: Exercise): void {
    if (!this.selectedPlan || !this.removingExercise) return;
    const exercise = this.removingExercise;
    this.alternativeActionLoading = true;
    this.plansApi.replaceExercise(this.selectedPlan.id, exercise.id, alternative.externalId).subscribe({
      next: () => {
        this.loadColumn(this.selectedPlan!.id);
        this.closeDialog();
      },
      error: (error: unknown) => {
        this.alternativeActionLoading = false;
        this.alternativesError = this.apiMessage(error, 'Übung konnte nicht ersetzt werden.');
      }
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
        this.columnExercises[plan.id] = [];
        this.planForm.reset({ name: '', description: 'Kraft' });
      },
      error: (error: unknown) => this.error = this.apiMessage(error, 'Trainingsplan konnte nicht gespeichert werden.')
    });
  }

  deletePlan(plan: Plan): void {
    this.plansApi.delete(plan.id).subscribe({
      next: () => {
        this.plans = this.plans.filter((item) => item.id !== plan.id);
        this.planToDelete = null;
      },
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

  loadExercises(): void {
    this.exercisesLoading = true;
    const muscles = this.selectedMuscle ? [this.selectedMuscle] : [];
    this.plansApi.searchExercises(this.exerciseSearch, muscles).subscribe({
      next: (result) => {
        this.exercises = result.exercises;
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
      'Plan not found.': 'Trainingsplan nicht gefunden.',
      'ExerciseDB not reachable.': 'Der Übungskatalog ist gerade nicht verfügbar.'
    } as Record<string, string>)[message] || message;
  }
}
