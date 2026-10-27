import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth.service';
import { Exercise, Plan, PlanExercise, PlanService } from '../plan.service';
import { BodyHeatmapComponent } from '../body-heatmap/body-heatmap.component';

// Welcher ExerciseDB-Muskel zu welcher Fläche der Körperfigur gehört
const MUSCLE_REGIONS: Record<string, string> = {
  'deltoids': 'shoulders', 'rear deltoids': 'shoulders', 'rotator cuff': 'shoulders',
  'pectorals': 'chest', 'serratus anterior': 'chest',
  'biceps': 'biceps', 'brachialis': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearms', 'wrist flexors': 'forearms', 'wrist extensors': 'forearms',
  'grip muscles': 'forearms', 'wrists': 'forearms', 'hands': 'forearms',
  'abdominals': 'abs', 'core': 'abs', 'obliques': 'abs', 'hip flexors': 'abs',
  'trapezius': 'traps', 'levator scapulae': 'traps', 'sternocleidomastoid': 'traps',
  'upper back': 'traps', 'rhomboids': 'traps',
  'latissimus dorsi': 'lats', 'back': 'lats',
  'erector spinae': 'lowerBack',
  'glutes': 'glutes', 'abductors': 'glutes',
  'quadriceps': 'quads', 'adductors': 'quads',
  'hamstrings': 'hamstrings',
  'calves': 'calves', 'soleus': 'calves', 'tibialis anterior': 'calves',
  'ankles': 'calves', 'ankle stabilizers': 'calves', 'feet': 'calves'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BodyHeatmapComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly plansApi = inject(PlanService);

  profileOpen = false;
  // Plan, dessen Statistik gerade angezeigt wird
  statsPlan: Plan | null = null;
  stats = { exercises: 0, sets: 0, reps: 0, volume: 0 };
  // Heatmap: Farbstufe 0 bis 4 je Körperregion
  heatmap: Record<string, number> = {};
  plans: Plan[] = [];
  // Übungen je Plan für die Spalten im Board
  columnExercises: Record<number, PlanExercise[]> = {};
  // Plan, in den der "+"-Button in der Übungsleiste eine Übung legt
  targetPlanId: number | null = null;
  // Übung, deren Dialog gerade offen ist
  dialogExercise: PlanExercise | null = null;
  // Übung, die gerade aus der Übungsleiste gezogen wird
  draggedExercise: Exercise | null = null;
  // Übung, die gerade innerhalb ihres Plans umsortiert wird, und die Einfügeposition
  draggedPlanExercise: { planId: number; exercise: PlanExercise } | null = null;
  dropIndex: number | null = null;
  // Plan, bei dem gerade die Lösch-Rückfrage angezeigt wird
  planToDelete: Plan | null = null;
  // Plan, der gerade umbenannt wird, und der neue Name aus dem Eingabefeld
  planToRename: Plan | null = null;
  renameValue = '';
  user: User | null = null;
  error = '';
  exercises: Exercise[] = [];
  exerciseSearch = '';
  selectedMuscle = '';
  muscles: string[] = [];
  exercisesLoading = false;
  selectedPlan: Plan | null = null;
  // Zustand im Übungs-Dialog
  showAlternatives = false;
  alternativeExercises: Exercise[] = [];
  alternativesLoading = false;
  confirmRemove = false;
  dialogError = '';
  editingNote = '';
  editingSets: number | null = null;
  editingReps: number | null = null;
  editingWeight: number | null = null;
  deletePassword = '';
  // Rückfrage vor dem Löschen des Kontos anzeigen
  confirmAccountDelete = false;

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

  startRename(plan: Plan): void {
    this.planToRename = plan;
    this.renameValue = plan.name;
  }

  renamePlan(plan: Plan): void {
    const name = this.renameValue.trim();
    if (!name) return;
    this.plansApi.update(plan.id, name, plan.description || '').subscribe({
      next: () => {
        this.planToRename = null;
        this.loadPlans();
      },
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

  // Drag & Drop innerhalb eines Plans: Reihenfolge der Übungen ändern
  startReorder(planId: number, exercise: PlanExercise, event: DragEvent): void {
    this.draggedPlanExercise = { planId, exercise };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(exercise.id));
    }
  }

  // Obere Kartenhälfte: davor einfügen, untere Hälfte: danach
  reorderOver(planId: number, index: number, event: DragEvent): void {
    if (this.draggedPlanExercise?.planId !== planId) return;
    event.preventDefault();
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    this.dropIndex = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
  }

  showDropMarker(planId: number, index: number): boolean {
    return this.draggedPlanExercise?.planId === planId && this.dropIndex === index;
  }

  dropReorder(planId: number, event: DragEvent): void {
    const dragged = this.draggedPlanExercise;
    const insertAt = this.dropIndex;
    if (!dragged || dragged.planId !== planId || insertAt === null) return;
    event.preventDefault();
    this.endReorder();

    const previous = this.columnExercises[planId] ?? [];
    const from = previous.findIndex((item) => item.id === dragged.exercise.id);
    const target = insertAt > from ? insertAt - 1 : insertAt;
    if (from < 0 || target === from) return;

    const reordered = [...previous];
    reordered.splice(target, 0, reordered.splice(from, 1)[0]);
    this.columnExercises[planId] = reordered.map((item, index) => ({ ...item, position: index + 1 }));
    this.plansApi.reorderExercises(planId, reordered.map((item) => item.id)).subscribe({
      next: (saved) => this.columnExercises[planId] = saved,
      error: (error: unknown) => {
        this.columnExercises[planId] = previous;
        this.error = this.apiMessage(error, 'Reihenfolge konnte nicht gespeichert werden.');
      }
    });
  }

  endReorder(): void {
    this.draggedPlanExercise = null;
    this.dropIndex = null;
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
    this.showAlternatives = false;
    this.alternativeExercises = [];
    this.confirmRemove = false;
    this.dialogError = '';
  }

  // Berechnet die Statistik eines Plans aus den geladenen Übungen
  openPlanStats(plan: Plan): void {
    this.stats = { exercises: 0, sets: 0, reps: 0, volume: 0 };
    for (const exercise of this.columnExercises[plan.id] || []) {
      const sets = exercise.sets || 0;
      const reps = exercise.reps || 0;
      const weight = exercise.weight || 0;
      this.stats.exercises += 1;
      this.stats.sets += sets;
      this.stats.reps += sets * reps;
      this.stats.volume += sets * reps * weight;
    }
    this.heatmap = this.buildHeatmap(this.columnExercises[plan.id] || []);
    this.statsPlan = plan;
  }

  // Zählt, wie stark jede Körperregion im Plan trainiert wird (primärer Muskel 2 Punkte, sekundärer 1 Punkt)
  buildHeatmap(exercises: PlanExercise[]): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const exercise of exercises) {
      for (const muscle of exercise.primaryMuscleGroups) this.addScore(scores, muscle, 2);
      for (const muscle of exercise.secondaryMuscleGroups) this.addScore(scores, muscle, 1);
    }
    // Punkte in Farbstufen 1 bis 4 umrechnen, die stärkste Region bekommt 4
    const max = Math.max(1, ...Object.values(scores));
    const levels: Record<string, number> = {};
    for (const region of Object.keys(scores)) levels[region] = Math.ceil(scores[region] / max * 4);
    return levels;
  }

  private addScore(scores: Record<string, number>, muscle: string, points: number): void {
    const region = MUSCLE_REGIONS[muscle.toLowerCase()];
    if (region) scores[region] = (scores[region] || 0) + points;
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

  // Klappt die Liste mit Übungen für die gleichen Muskeln auf oder zu
  toggleAlternatives(): void {
    this.showAlternatives = !this.showAlternatives;
    if (!this.showAlternatives || !this.selectedPlan || !this.dialogExercise) return;
    this.alternativesLoading = true;
    this.plansApi.alternatives(this.selectedPlan.id, this.dialogExercise.id).subscribe({
      next: (alternatives) => {
        this.alternativeExercises = alternatives;
        this.alternativesLoading = false;
      },
      error: (error: unknown) => {
        this.alternativesLoading = false;
        this.dialogError = this.apiMessage(error, 'Alternativen konnten nicht geladen werden.');
      }
    });
  }

  removeExercise(): void {
    if (!this.selectedPlan || !this.dialogExercise) return;
    this.plansApi.deleteExercise(this.selectedPlan.id, this.dialogExercise.id).subscribe({
      next: () => {
        this.updatePlanCount(this.selectedPlan!.id, this.selectedPlan!.exerciseCount - 1);
        this.loadColumn(this.selectedPlan!.id);
        this.closeDialog();
      },
      error: (error: unknown) => this.dialogError = this.apiMessage(error, 'Übung konnte nicht entfernt werden.')
    });
  }

  // Ersetzt die Übung im Plan, Gewicht, Sätze, Wiederholungen und Notiz bleiben erhalten
  replaceExerciseWith(alternative: Exercise): void {
    if (!this.selectedPlan || !this.dialogExercise) return;
    this.plansApi.replaceExercise(this.selectedPlan.id, this.dialogExercise.id, alternative.externalId).subscribe({
      next: () => {
        this.loadColumn(this.selectedPlan!.id);
        this.closeDialog();
      },
      error: (error: unknown) => this.dialogError = this.apiMessage(error, 'Übung konnte nicht ersetzt werden.')
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
    if (!this.deletePassword) return;
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
