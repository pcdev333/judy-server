-- Rollback: Phase 6 streak columns
ALTER TABLE public.users
  DROP COLUMN IF EXISTS current_streak,
  DROP COLUMN IF EXISTS longest_streak,
  DROP COLUMN IF EXISTS last_workout_date;
