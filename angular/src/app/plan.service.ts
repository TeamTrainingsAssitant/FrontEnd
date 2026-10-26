import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
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
  gifUrl: string;
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
}

export interface PlanExercise extends Exercise {
  id: number;
  position: number;
  note: string | null;
}

// GraphQL liefert IDs als Text, die Oberfläche rechnet mit Zahlen
type WithStringId<T> = Omit<T, 'id'> & { id: string };

const PLAN_FIELDS = 'id name description updatedAt exerciseCount';
const EXERCISE_FIELDS = 'id externalId name gifUrl primaryMuscleGroups secondaryMuscleGroups position note';

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

  addExercise(planId: number, externalId: string, note: string): Observable<PlanExercise> {
    return this.graphql
      .request<{ addExerciseToPlan: WithStringId<PlanExercise> }>(
        `mutation ($planId: ID!, $input: AddPlanExerciseInput!) {
          addExerciseToPlan(planId: $planId, input: $input) { ${EXERCISE_FIELDS} }
        }`,
        { planId: String(planId), input: { externalId, note: note || null } }
      )
      .pipe(map((data) => toPlanExercise(data.addExerciseToPlan)));
  }

  updateExercise(planId: number, exerciseId: number, note: string): Observable<PlanExercise> {
    return this.graphql
      .request<{ updatePlanExercise: WithStringId<PlanExercise> }>(
        `mutation ($planId: ID!, $planExerciseId: ID!, $input: UpdatePlanExerciseInput!) {
          updatePlanExercise(planId: $planId, planExerciseId: $planExerciseId, input: $input) { ${EXERCISE_FIELDS} }
        }`,
        { planId: String(planId), planExerciseId: String(exerciseId), input: { note: note || null } }
      )
      .pipe(map((data) => toPlanExercise(data.updatePlanExercise)));
  }

  deleteExercise(planId: number, exerciseId: number): Observable<unknown> {
    return this.graphql.request(
      `mutation ($planId: ID!, $planExerciseId: ID!) {
        removePlanExercise(planId: $planId, planExerciseId: $planExerciseId) { message }
      }`,
      { planId: String(planId), planExerciseId: String(exerciseId) }
    );
  }

  searchExercises(name = ''): Observable<Exercise[]> {
    return this.graphql
      .request<{ searchExercises: Exercise[] }>(
        `query ($name: String, $limit: Int) {
          searchExercises(name: $name, limit: $limit) { externalId name gifUrl primaryMuscleGroups secondaryMuscleGroups }
        }`,
        { name, limit: 20 }
      )
      .pipe(map((data) => data.searchExercises));
  }
}
