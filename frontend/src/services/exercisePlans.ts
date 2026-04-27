import exercisesJson from "../data/exercises.json";
import {
  ExerciseEquipmentBucket,
  ExerciseGoal,
  ExerciseItem,
  ExerciseSplitData,
} from "../types";

const exercises = exercisesJson as ExerciseSplitData;

export const EXERCISE_GOALS: ExerciseGoal[] = [
  "maintain_weight",
  "lose_weight",
  "gain_weight",
];

export const EXERCISE_BUCKETS: ExerciseEquipmentBucket[] = [
  "with_treadmill",
  "with_cycle",
  "without_cardio",
];

export function getExercises(goal: ExerciseGoal, bucket: ExerciseEquipmentBucket): ExerciseItem[] {
  return exercises[goal]?.[bucket] ?? [];
}

export function getGoalLabel(goal: ExerciseGoal): string {
  switch (goal) {
    case "maintain_weight":
      return "Maintain Weight";
    case "lose_weight":
      return "Lose Weight";
    case "gain_weight":
      return "Gain Weight";
    default:
      return goal;
  }
}

export function getBucketLabel(bucket: ExerciseEquipmentBucket): string {
  switch (bucket) {
    case "with_treadmill":
      return "With Treadmill";
    case "with_cycle":
      return "With Cycle";
    case "without_cardio":
      return "Without Treadmill/Cycle";
    default:
      return bucket;
  }
}
