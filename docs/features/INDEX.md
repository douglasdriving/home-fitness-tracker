# Feature Documentation Index

## Pages

| Page | Route | Features |
|---|---|---|
| Dashboard | `/` | Daily Rotation Mode, Exercise Emoji Icons |
| Calibration | `/calibration` | Exercise Emoji Icons |
| Workout Execution | `/workout` | Coaching Tips, Intensity Feedback, Exercise Emoji Icons, McGill Protocol |
| Workout Complete | `/workout-complete` | Exercise Emoji Icons, McGill Protocol |
| Stretching Routine | `/stretching` | Daily Rotation Mode (chains to Meditation Timer) |
| Meditation Timer | `/meditation` | Progressive post-workout meditation |
| History | `/history` | Exercise Emoji Icons, McGill Protocol, Workout Duration Tracking |
| Exercise Library | `/exercises` | Exercise Progression, Exercise Emoji Icons, McGill Protocol |
| Settings | `/settings` | Custom Workout Builder, Exercise Emoji Icons |

## Features

| Feature | Description | Doc |
|---|---|---|
| Coaching Tips | Persistent form cues and safety notes displayed on workout screen during exercise execution | [coaching-tips.md](coaching-tips.md) |
| Custom Workout Builder | Dev-only tool to manually select exercises and create custom workouts for testing | [custom-workout-builder.md](custom-workout-builder.md) |
| Daily Rotation Mode | Shorter muscle-group-focused workouts rotating through abs, glutes, lower back with group-specific stretching | [daily-rotation-mode.md](daily-rotation-mode.md) |
| Exercise Emoji Icons | Visually representative emoji icons displayed before exercise names across all views | [exercise-emoji-icons.md](exercise-emoji-icons.md) |
| Exercise Data Migration | Converts historical workout data when an exercise changes type (e.g., timed to reps) | [exercise-data-migration.md](exercise-data-migration.md) |
| Exercise Progression | Unlock chains and retirement thresholds that advance users through harder exercises | [exercise-progression.md](exercise-progression.md) |
| Intensity Feedback | Post-exercise difficulty ratings that adjust next workout targets | [intensity-feedback.md](intensity-feedback.md) |
| McGill Protocol | Ceiling-based short-hold protocol for static timed holds (Side Plank, Plank): multiple short holds in descending sets, adding reps instead of seconds once a per-exercise hold ceiling is reached | [mcgill-protocol.md](mcgill-protocol.md) |
| Meditation Timer | Progressive post-workout meditation timer with habit-based duration increases (1-15 min) | [meditation-timer.md](meditation-timer.md) |
| Workout Duration Tracking | Tracks elapsed time from workout start to completion, surviving app closures and resumes | [workout-duration-tracking.md](workout-duration-tracking.md) |
