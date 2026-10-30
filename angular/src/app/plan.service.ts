import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { GraphqlService } from './graphql.service';

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
  gifUrl: string | null;
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
}

export interface PlanExercise extends Exercise {
  id: number;
  position: number;
  note: string | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  trainingSets: TrainingSet[];
}

export interface TrainingSet {
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

// GraphQL liefert IDs als Text, die Oberfläche rechnet mit Zahlen
type WithStringId<T> = Omit<T, 'id'> & { id: string };

const PLAN_FIELDS = 'id name description updatedAt exerciseCount';
const EXERCISE_FIELDS = 'id externalId name gifUrl primaryMuscleGroups secondaryMuscleGroups position note sets reps weight trainingSets { weight reps completed }';
const CATALOG_FIELDS = 'externalId name gifUrl primaryMuscleGroups secondaryMuscleGroups';

const toPlan = (plan: WithStringId<Plan>): Plan => ({ ...plan, id: Number(plan.id) });
const toPlanExercise = (exercise: WithStringId<PlanExercise>): PlanExercise => ({ ...exercise, id: Number(exercise.id) });

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly graphql = inject(GraphqlService);

  list(): Observable<Plan[]> {
    return this.graphql
      .request<{ plans: WithStringId<Plan>[] }>(`{ plans { ${PLAN_FIELDS} } }`)
      .pipe(map((data) => data.plans.map(toPlan)));
  }

  create(name: string, description: string): Observable<Plan> {
    return this.graphql
      .request<{ createPlan: WithStringId<Plan> }>(
        `mutation ($input: PlanInput!) { createPlan(input: $input) { ${PLAN_FIELDS} } }`,
        { input: { name, description } }
      )
      .pipe(map((data) => toPlan(data.createPlan)));
  }

  update(id: number, name: string, description: string): Observable<Plan> {
    return this.graphql
      .request<{ updatePlan: WithStringId<Plan> }>(
        `mutation ($id: ID!, $input: PlanInput!) { updatePlan(id: $id, input: $input) { ${PLAN_FIELDS} } }`,
        { id: String(id), input: { name, description } }
      )
      .pipe(map((data) => toPlan(data.updatePlan)));
  }

  delete(id: number): Observable<unknown> {
    return this.graphql.request(
      'mutation ($id: ID!) { deletePlan(id: $id) { message } }',
      { id: String(id) }
    );
  }

  listExercises(planId: number): Observable<PlanExercise[]> {
    return this.graphql
      .request<{ plan: { exercises: WithStringId<PlanExercise>[] } }>(
        `query ($id: ID!) { plan(id: $id) { exercises { ${EXERCISE_FIELDS} } } }`,
        { id: String(planId) }
      )
      .pipe(map((data) => data.plan.exercises.map(toPlanExercise)));
  }

  addExercise(
    planId: number,
    externalId: string,
    note: string,
    sets: number | null,
    reps: number | null,
    weight: number | null
  ): Observable<PlanExercise> {
    return this.graphql
      .request<{ addExerciseToPlan: WithStringId<PlanExercise> }>(
        `mutation ($planId: ID!, $input: AddPlanExerciseInput!) {
          addExerciseToPlan(planId: $planId, input: $input) { ${EXERCISE_FIELDS} }
        }`,
        { planId: String(planId), input: { externalId, note: note || null, sets, reps, weight } }
      )
      .pipe(map((data) => toPlanExercise(data.addExerciseToPlan)));
  }

  updateExercise(
    planId: number,
    exerciseId: number,
    note: string,
    trainingSets: TrainingSet[]
  ): Observable<PlanExercise> {
    return this.graphql
      .request<{ updatePlanExercise: WithStringId<PlanExercise> }>(
        `mutation ($planId: ID!, $planExerciseId: ID!, $input: UpdatePlanExerciseInput!) {
          updatePlanExercise(planId: $planId, planExerciseId: $planExerciseId, input: $input) { ${EXERCISE_FIELDS} }
        }`,
        {
          planId: String(planId),
          planExerciseId: String(exerciseId),
          input: { note: note || null, trainingSets }
        }
      )
      .pipe(map((data) => toPlanExercise(data.updatePlanExercise)));
  }

  alternatives(planId: number, exerciseId: number, limit = 5): Observable<Exercise[]> {
    return this.graphql.request<{ alternativesForPlanExercise: Exercise[] }>(
      `query ($planId: ID!, $planExerciseId: ID!, $limit: Int) {
        alternativesForPlanExercise(planId: $planId, planExerciseId: $planExerciseId, limit: $limit) {
          ${CATALOG_FIELDS}
        }
      }`,
      { planId: String(planId), planExerciseId: String(exerciseId), limit }
    ).pipe(map((data) => data.alternativesForPlanExercise));
  }

  replaceExercise(planId: number, exerciseId: number, externalId: string): Observable<PlanExercise> {
    return this.graphql
      .request<{ replacePlanExercise: WithStringId<PlanExercise> }>(
        `mutation ($planId: ID!, $planExerciseId: ID!, $externalId: ID!) {
          replacePlanExercise(planId: $planId, planExerciseId: $planExerciseId, externalId: $externalId) {
            ${EXERCISE_FIELDS}
          }
        }`,
        { planId: String(planId), planExerciseId: String(exerciseId), externalId }
      )
      .pipe(map((data) => toPlanExercise(data.replacePlanExercise)));
  }

  reorderExercises(planId: number, exerciseIds: number[]): Observable<PlanExercise[]> {
    return this.graphql
      .request<{ reorderPlanExercises: WithStringId<PlanExercise>[] }>(
        `mutation ($planId: ID!, $planExerciseIds: [ID!]!) {
          reorderPlanExercises(planId: $planId, planExerciseIds: $planExerciseIds) { ${EXERCISE_FIELDS} }
        }`,
        { planId: String(planId), planExerciseIds: exerciseIds.map(String) }
      )
      .pipe(map((data) => data.reorderPlanExercises.map(toPlanExercise)));
  }

  deleteExercise(planId: number, exerciseId: number): Observable<unknown> {
    return this.graphql.request(
      `mutation ($planId: ID!, $planExerciseId: ID!) {
        removePlanExercise(planId: $planId, planExerciseId: $planExerciseId) { message }
      }`,
      { planId: String(planId), planExerciseId: String(exerciseId) }
    );
  }

  searchExercises(name = '', muscles: string[] = []): Observable<{ total: number; exercises: Exercise[] }> {
    if (muscles.length > 1) {
      return forkJoin(muscles.map((muscle) => this.searchExercisesForMuscles(name, [muscle], 50))).pipe(
        map((results) => {
          const unique = new Map<string, Exercise>();
          results.forEach((result) => result.exercises.forEach((exercise) => unique.set(exercise.externalId, exercise)));
          const exercises = [...unique.values()];
          return { total: exercises.length, exercises: exercises.slice(0, 20) };
        })
      );
    }
    return this.searchExercisesForMuscles(name, muscles, 20);
  }

  private searchExercisesForMuscles(name: string, muscles: string[], limit: number): Observable<{ total: number; exercises: Exercise[] }> {
    return this.graphql
      .request<{ exercises: { total: number; exercises: Exercise[] } }>(
        `query ($name: String, $muscles: [String!], $limit: Int) {
          exercises(name: $name, muscles: $muscles, limit: $limit) {
            total
            exercises { ${CATALOG_FIELDS} }
          }
        }`,
        { name: name || null, muscles: muscles.length ? muscles : null, limit }
      )
      .pipe(map((data) => data.exercises));
  }

  muscles(): Observable<string[]> {
    return this.graphql.request<{ muscles: string[] }>('{ muscles }').pipe(map((data) => data.muscles));
  }
}
