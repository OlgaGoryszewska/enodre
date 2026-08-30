import { Activity, Dumbbell, Flower2, Footprints, type LucideIcon } from "lucide-react";

export const WORKOUT_CATEGORIES = ["pilates", "strength", "run", "yoga"] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];

export const workoutCategoryLabels: Record<WorkoutCategory, string> = {
  pilates: "Pilates",
  strength: "Strength",
  run: "Run",
  yoga: "Yoga",
};

export const workoutCategoryIcons: Record<WorkoutCategory, LucideIcon> = {
  pilates: Activity,
  strength: Dumbbell,
  run: Footprints,
  yoga: Flower2,
};

// Run has no exercise picker — it's logged as plain minutes/km/kcal burned
// instead (see WorkoutTracker.tsx), so it has no entry here.
export const WORKOUT_OPTIONS: Record<Exclude<WorkoutCategory, "run">, string[]> = {
  pilates: [
    "The Hundred",
    "Roll Up",
    "Single Leg Circle",
    "Rolling Like a Ball",
    "Single Leg Stretch",
    "Double Leg Stretch",
    "Spine Stretch Forward",
    "Open Leg Rocker",
    "Corkscrew",
    "Saw",
    "Swan",
    "Single Leg Kick",
    "Double Leg Kick",
    "Neck Pull",
    "Side Kick Series",
    "Teaser",
    "Seal",
    "Side Bend",
    "Boomerang",
    "Swimming",
  ],
  strength: [
    "Squat",
    "Deadlift",
    "Bench Press",
    "Shoulder Press",
    "Dumbbell Flye",
    "Bicep Curl",
    "Tricep Dip",
    "Lat Pulldown",
    "Bent-Over Row",
    "Lunges",
    "Leg Press",
    "Leg Curl",
    "Calf Raise",
    "Plank",
    "Russian Twist",
    "Hip Thrust",
    "Pull-Up",
    "Push-Up",
    "Overhead Tricep Extension",
    "Farmer's Carry",
  ],
  yoga: [
    "Downward Dog",
    "Warrior 1",
    "Warrior 2",
    "Camel Pose",
    "Child's Pose",
    "Cobra Pose",
    "Cat-Cow",
    "Tree Pose",
    "Triangle Pose",
    "Pigeon Pose",
    "Bridge Pose",
    "Cobbler's Pose",
    "Mountain Pose",
    "Chair Pose",
    "Half Moon Pose",
    "Eagle Pose",
    "Crow Pose",
    "Plank Pose",
    "Fish Pose",
    "Savasana",
  ],
};
