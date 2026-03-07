-- Phase 6: Add streak tracking columns to users table
-- current_streak: number of consecutive days with completed workouts
-- longest_streak: all-time personal best streak (never decreases)
-- last_workout_date: date of last completed workout, used to calculate streak continuity

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_streak    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_workout_date DATE;

-- Add a comment for documentation
COMMENT ON COLUMN public.users.current_streak    IS 'Number of consecutive days the user has completed a workout';
COMMENT ON COLUMN public.users.longest_streak    IS 'All-time personal best consecutive workout streak';
COMMENT ON COLUMN public.users.last_workout_date IS 'ISO date of the most recently completed workout, used to determine streak continuity';
