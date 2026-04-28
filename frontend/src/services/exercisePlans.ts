import exercisesJson from "../data/exercises.json";
import {
  ExerciseBodyPart,
  ExerciseEquipmentBucket,
  ExerciseGoal,
  ExerciseItem,
  ExerciseMediaResource,
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

export const EXERCISE_BODY_PARTS: ExerciseBodyPart[] = [
  "mix",
  "back",
  "chest",
  "shoulders",
  "legs",
  "biceps_triceps",
  "core",
];

const CURATED_BODY_PART_EXERCISES: Partial<Record<ExerciseBodyPart, ExerciseItem[]>> = {
  back: [
    {
      id: "back-curated-1",
      name: "Bent-over barbell row",
      bodyPart: "back",
      sets: 4,
      reps: "6-10",
      rest: "2-3 min",
      targetMuscles: "Mid-back, lats, rear delts",
      detail: "Hinge with neutral spine, pull bar toward lower ribs, control eccentric. Keep torso angle stable.",
      alternatives: ["Chest-supported row", "T-bar row", "Seated cable row"],
    },
    {
      id: "back-curated-2",
      name: "Pull-up or assisted pull-up",
      bodyPart: "back",
      sets: 4,
      reps: "6-12",
      rest: "2 min",
      targetMuscles: "Lats, teres major, biceps",
      detail: "Start from dead hang, pull elbows toward your sides. Avoid kipping for hypertrophy-focused sets.",
      alternatives: ["Lat pulldown", "Neutral-grip pull-up", "Band-assisted pull-up"],
    },
    {
      id: "back-curated-3",
      name: "Lat pulldown",
      bodyPart: "back",
      sets: 3,
      reps: "8-12",
      rest: "90s",
      targetMuscles: "Lats and upper back",
      detail: "Pull bar to upper chest with shoulder blades down/back; control full stretch on return.",
      alternatives: ["Single-arm pulldown", "Machine high row", "Pull-up progression"],
    },
    {
      id: "back-curated-4",
      name: "Seated cable row",
      bodyPart: "back",
      sets: 3,
      reps: "10-14",
      rest: "75-90s",
      targetMuscles: "Rhomboids, middle traps, lats",
      detail: "Stay tall, pull to lower ribs and squeeze shoulder blades together briefly before returning.",
      alternatives: ["Chest-supported DB row", "Inverted row", "Seal row"],
    },
    {
      id: "back-curated-5",
      name: "Inverted row",
      bodyPart: "back",
      sets: 3,
      reps: "8-15",
      rest: "75s",
      targetMuscles: "Mid-back and rear shoulder stabilizers",
      detail: "Body rigid like plank, row chest toward bar/rings, pause at top.",
      alternatives: ["TRX row", "Smith bar row", "Ring row"],
    },
    {
      id: "back-curated-6",
      name: "One-arm dumbbell row",
      bodyPart: "back",
      sets: 3,
      reps: "10-12/side",
      rest: "75s",
      targetMuscles: "Lats, mid-back",
      detail: "Drive elbow toward hip and avoid torso rotation; full stretch at the bottom.",
      alternatives: ["Meadows row", "Single-arm cable row", "Machine unilateral row"],
    },
    {
      id: "back-curated-7",
      name: "I-Y-T raise",
      bodyPart: "back",
      sets: 3,
      reps: "10-12 each pattern",
      rest: "60s",
      targetMuscles: "Lower/mid traps, rear delts",
      detail: "Use light load and strict control. Move through I, Y, and T shapes without shrugging.",
      alternatives: ["Prone Y raise", "Face pull", "Reverse pec deck"],
    },
    {
      id: "back-curated-8",
      name: "Face pull",
      bodyPart: "back",
      sets: 3,
      reps: "12-18",
      rest: "60s",
      targetMuscles: "Rear delts, upper back, external rotators",
      detail: "Pull rope toward face with elbows high, finish with external rotation.",
      alternatives: ["Reverse fly", "Band pull-apart", "Rear delt cable fly"],
    },
  ],
  chest: [
    {
      id: "chest-curated-1",
      name: "Flat barbell bench press",
      bodyPart: "chest",
      sets: 4,
      reps: "5-8",
      rest: "2-3 min",
      targetMuscles: "Pectoralis major, triceps, anterior delts",
      detail: "Grip roughly shoulder-width to 2x shoulder-width, controlled touch on chest and strong press path.",
      alternatives: ["Dumbbell bench press", "Machine chest press", "Smith bench press"],
    },
    {
      id: "chest-curated-2",
      name: "Incline bench press (15-30 deg)",
      bodyPart: "chest",
      sets: 3,
      reps: "6-10",
      rest: "2 min",
      targetMuscles: "Upper chest focus",
      detail: "Use moderate incline so pressing remains chest-dominant rather than shoulder-dominant.",
      alternatives: ["Incline DB press", "Low-to-high cable press", "Reverse-grip bench"],
    },
    {
      id: "chest-curated-3",
      name: "Dumbbell bench press",
      bodyPart: "chest",
      sets: 3,
      reps: "8-12",
      rest: "90s",
      targetMuscles: "Chest through larger ROM",
      detail: "Control eccentric, keep shoulder blades set, press smoothly without bouncing.",
      alternatives: ["Neutral-grip DB press", "Floor press", "Machine converging press"],
    },
    {
      id: "chest-curated-4",
      name: "Push-up progression",
      bodyPart: "chest",
      sets: 3,
      reps: "AMRAP quality",
      rest: "75s",
      targetMuscles: "Chest + pressing endurance",
      detail: "Use floor, incline, or weighted variations to stay near failure with clean reps.",
      alternatives: ["Deficit push-up", "Ring push-up", "Knee push-up progression"],
    },
    {
      id: "chest-curated-5",
      name: "Weighted dip (chest bias)",
      bodyPart: "chest",
      sets: 3,
      reps: "6-10",
      rest: "2 min",
      targetMuscles: "Lower chest and triceps",
      detail: "Slight forward torso lean, controlled depth, avoid painful shoulder range.",
      alternatives: ["Assisted dip", "Decline press", "Parallel-bar bodyweight dip"],
    },
    {
      id: "chest-curated-6",
      name: "Cable fly / cable crossover",
      bodyPart: "chest",
      sets: 3,
      reps: "10-15",
      rest: "60-75s",
      targetMuscles: "Pectoral adduction and squeeze",
      detail: "Soft elbows, arc motion, squeeze at midline and return under control.",
      alternatives: ["Pec deck fly", "DB fly (light)", "Single-arm cable fly"],
    },
    {
      id: "chest-curated-7",
      name: "Machine chest press",
      bodyPart: "chest",
      sets: 3,
      reps: "8-12",
      rest: "90s",
      targetMuscles: "Chest with high stability",
      detail: "Useful for pushing close to failure safely with fixed path and reduced setup demand.",
      alternatives: ["Hammer strength press", "Smith press", "DB press"],
    },
    {
      id: "chest-curated-8",
      name: "Decline bench press",
      bodyPart: "chest",
      sets: 3,
      reps: "6-10",
      rest: "2 min",
      targetMuscles: "Lower chest emphasis",
      detail: "Stable setup and smooth bar path; stop short of shoulder discomfort.",
      alternatives: ["Decline DB press", "Dip variation", "High-to-low cable press"],
    },
  ],
  shoulders: [
    {
      id: "shoulder-curated-1",
      name: "Standing overhead press",
      bodyPart: "shoulders",
      sets: 4,
      reps: "5-8",
      rest: "2-3 min",
      targetMuscles: "Anterior delts, triceps, upper back stabilizers",
      detail: "Brace trunk and glutes, press in vertical path, avoid overextending lower back.",
      alternatives: ["Seated DB press", "Machine shoulder press", "Landmine press"],
    },
    {
      id: "shoulder-curated-2",
      name: "Seated dumbbell shoulder press",
      bodyPart: "shoulders",
      sets: 3,
      reps: "8-12",
      rest: "90s",
      targetMuscles: "Anterior and medial delts",
      detail: "Control lowering phase and keep elbows under wrists for efficient pressing.",
      alternatives: ["Arnold press", "Machine press", "High incline DB press"],
    },
    {
      id: "shoulder-curated-3",
      name: "Cable lateral raise (single arm)",
      bodyPart: "shoulders",
      sets: 3,
      reps: "12-20",
      rest: "60s",
      targetMuscles: "Medial deltoid",
      detail: "Raise in scapular plane with slight elbow bend; avoid shrugging.",
      alternatives: ["DB lateral raise", "Machine lateral raise", "Lean-away lateral raise"],
    },
    {
      id: "shoulder-curated-4",
      name: "Dumbbell lateral raise",
      bodyPart: "shoulders",
      sets: 3,
      reps: "12-20",
      rest: "60s",
      targetMuscles: "Side delts for width",
      detail: "Lead with elbows, smooth tempo, and stop before traps dominate.",
      alternatives: ["Cable lateral raise", "Partial laterals", "Y-raise"],
    },
    {
      id: "shoulder-curated-5",
      name: "Bent-over rear delt fly",
      bodyPart: "shoulders",
      sets: 3,
      reps: "12-15",
      rest: "60s",
      targetMuscles: "Posterior deltoid",
      detail: "Hinge and keep torso fixed, move from shoulders not lower back swing.",
      alternatives: ["Reverse pec deck", "Cable rear delt fly", "Chest-supported rear delt raise"],
    },
    {
      id: "shoulder-curated-6",
      name: "Face pull",
      bodyPart: "shoulders",
      sets: 3,
      reps: "12-18",
      rest: "60s",
      targetMuscles: "Rear delts, external rotators, traps",
      detail: "Pull to eye level and rotate out at end-range for shoulder health emphasis.",
      alternatives: ["Band face pull", "Rear delt cable row", "Reverse fly"],
    },
    {
      id: "shoulder-curated-7",
      name: "Upright row (moderate range)",
      bodyPart: "shoulders",
      sets: 3,
      reps: "8-12",
      rest: "75s",
      targetMuscles: "Delts and upper traps",
      detail: "Use shoulder-friendly grip width and ROM; stop before impingement discomfort.",
      alternatives: ["High pull cable", "Wide-grip upright row", "Lateral raise emphasis"],
    },
    {
      id: "shoulder-curated-8",
      name: "High incline dumbbell press",
      bodyPart: "shoulders",
      sets: 3,
      reps: "8-12",
      rest: "90s",
      targetMuscles: "Anterior delts with upper chest overlap",
      detail: "Bench around 60-70 degrees. Control eccentric and keep shoulder blades lightly retracted.",
      alternatives: ["Seated machine press", "Landmine press", "Arnold press"],
    },
  ],
};

export function getExercises(goal: ExerciseGoal, bucket: ExerciseEquipmentBucket): ExerciseItem[] {
  return exercises[goal]?.[bucket] ?? [];
}

export function getExerciseBodyPart(exercise: ExerciseItem): ExerciseBodyPart {
  if (exercise.bodyPart) {
    return exercise.bodyPart;
  }

  const haystack = `${exercise.name} ${exercise.targetMuscles ?? ""}`.toLowerCase();

  // Highly specific groups first to avoid broad keyword collisions.
  if (
    /curl|triceps|biceps|pushdown|skull crusher|hammer curl|preacher/.test(haystack)
  ) {
    return "biceps_triceps";
  }

  if (/plank|dead bug|pallof|crunch|oblique|ab |abs|core|leg raise/.test(haystack)) {
    return "core";
  }

  if (/shoulder|overhead|lateral raise|rear delt|face pull|arnold/.test(haystack)) {
    return "shoulders";
  }

  if (/row|pulldown|pull-up|lat|back|trap|farmer carry|meadows/.test(haystack)) {
    return "back";
  }

  if (
    /squat|deadlift|lunge|step-up|leg press|hamstring|glute|quad|calf|bike|treadmill|walk|cycle|hip thrust|thrust|swing/.test(
      haystack
    )
  ) {
    return "legs";
  }

  // Keep chest broad, but only after shoulders/back/legs have been ruled out.
  if (
    /bench|push-up|pushup|chest|fly|crossover|dip|press/.test(haystack) &&
    !/leg press|shoulder|overhead|landmine/.test(haystack)
  ) {
    return "chest";
  }

  return "mix";
}

export function filterExercisesByBodyPart(
  exerciseList: ExerciseItem[],
  bodyPart: ExerciseBodyPart
): ExerciseItem[] {
  if (bodyPart === "mix") {
    return exerciseList;
  }

  return exerciseList.filter((exercise) => getExerciseBodyPart(exercise) === bodyPart);
}

export function getBodyPartExerciseOptions(
  goal: ExerciseGoal,
  bucket: ExerciseEquipmentBucket,
  bodyPart: ExerciseBodyPart,
  minCount = 7,
  maxCount = 8
): ExerciseItem[] {
  const curated = CURATED_BODY_PART_EXERCISES[bodyPart];
  if (curated?.length) {
    return curated.slice(0, maxCount);
  }

  const primaryList = getExercises(goal, bucket);
  const filteredPrimary = filterExercisesByBodyPart(primaryList, bodyPart);

  if (bodyPart === "mix") {
    return primaryList.slice(0, maxCount);
  }

  if (filteredPrimary.length >= minCount) {
    return filteredPrimary.slice(0, maxCount);
  }

  const seen = new Set(filteredPrimary.map((exercise) => exercise.name.toLowerCase()));
  const supplemented = [...filteredPrimary];

  for (const otherBucket of EXERCISE_BUCKETS) {
    if (otherBucket === bucket) {
      continue;
    }

    const matches = filterExercisesByBodyPart(getExercises(goal, otherBucket), bodyPart);
    for (const match of matches) {
      const dedupeKey = match.name.toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      supplemented.push(match);

      if (supplemented.length >= maxCount) {
        return supplemented;
      }
    }
  }

  return supplemented;
}

export function getLearningResources(exercise: ExerciseItem): ExerciseMediaResource[] {
  if (exercise.media?.length) {
    return exercise.media;
  }

  // Fallback is generated on-device to avoid any extra API roundtrip.
  const searchQuery = encodeURIComponent(`${exercise.name} exercise tutorial proper form`);
  return [
    {
      type: "youtube",
      title: `Watch: ${exercise.name}`,
      url: `https://www.youtube.com/results?search_query=${searchQuery}`,
    },
  ];
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

export function getBodyPartLabel(bodyPart: ExerciseBodyPart): string {
  switch (bodyPart) {
    case "mix":
      return "Mix";
    case "back":
      return "Back";
    case "chest":
      return "Chest";
    case "shoulders":
      return "Shoulders";
    case "legs":
      return "Legs";
    case "biceps_triceps":
      return "Biceps/Triceps";
    case "core":
      return "Core";
    default:
      return bodyPart;
  }
}
