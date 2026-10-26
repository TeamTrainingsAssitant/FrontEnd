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

export interface PlanExercise extends Exercise {
  id: number;
  position: number;
  note: string | null;
}

// GraphQL liefert IDs als Text, die Oberfläche rechnet mit Zahlen
type WithStringId<T> = Omit<T, 'id'> & { id: string };

const PLAN_FIELDS = 'id name description updatedAt exerciseCount';
const EXERCISE_FIELDS = 'id externalId name gifUrl primaryMuscleGroups secondaryMuscleGroups position note';
const CATALOG_FIELDS = 'externalId name gifUrl primaryMuscleGroups secondaryMuscleGroups bodyParts equipments';

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

  get(id: number): Observable<PlanDetails> {
    return this.graphql
      .request<{ plan: WithStringId<PlanDetails> }>(
        'query ($id: ID!) { plan(id: $id) { id name description createdAt updatedAt } }',
        { id: String(id) }
      )
      .pipe(map((data) => ({ ...data.plan, id: Number(data.plan.id) })));
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

  searchExercises(name = '', muscles: string[] = [], offset = 0): Observable<{ total: number; exercises: Exercise[] }> {
    return this.graphql
      .request<{ exercises: { total: number; exercises: Exercise[] } }>(
        `query ($name: String, $muscles: [String!], $offset: Int, $limit: Int) {
          exercises(name: $name, muscles: $muscles, offset: $offset, limit: $limit) {
            total
            exercises { ${CATALOG_FIELDS} }
          }
        }`,
        { name: name || null, muscles: muscles.length ? muscles : null, offset, limit: 20 }
      )
      .pipe(map((data) => data.exercises));
  }

  muscles(): Observable<string[]> {
    return this.graphql.request<{ muscles: string[] }>('{ muscles }').pipe(map((data) => data.muscles));
  }

  bodyParts(): Observable<string[]> {
    return this.graphql.request<{ bodyParts: string[] }>('{ bodyParts }').pipe(map((data) => data.bodyParts));
  }
}
