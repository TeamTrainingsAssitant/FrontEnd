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
  removingExercise: PlanExercise | null = null;
  alternativeExercises: Exercise[] = [];
  alternativesLoading = false;
  alternativeActionLoading = false;
  alternativesError = '';
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
      next: (plans) => {
        this.plans = plans;
        plans.forEach((plan) => this.loadColumn(plan.id));
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

  // Kurzinfo unter einer Übung, z. B. "60 kg · 3 × 10"
  exerciseInfo(exercise: PlanExercise): string {
    const parts: string[] = [];
    if (exercise.weight !== null) parts.push(exercise.weight + ' kg');
    if (exercise.sets && exercise.reps) parts.push(exercise.sets + ' × ' + exercise.reps);
    return parts.join(' · ');
  }

  selectPlan(plan: Plan): void {
    this.cancelExerciseRemoval();
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
        this.planExercises = this.planExercises
          .filter((item) => item.id !== exercise.id)
          .map((item, index) => ({ ...item, position: index + 1 }));
        this.updatePlanCount(this.selectedPlan!.id, this.planExercises.length);
        this.cancelExerciseRemoval();
        this.message = 'Übung aus dem Plan entfernt.';
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
      next: (replacement) => {
        this.planExercises = this.planExercises.map((item) => item.id === replacement.id ? replacement : item);
        this.cancelExerciseRemoval();
        this.message = `${exercise.name} wurde durch ${replacement.name} ersetzt.`;
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
      'Plan not found.': 'Trainingsplan nicht gefunden.',
      'ExerciseDB not reachable.': 'Der Übungskatalog ist gerade nicht verfügbar.'
    } as Record<string, string>)[message] || message;
  }
}
