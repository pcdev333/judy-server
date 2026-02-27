-- ============================================================
-- Judy – initial schema migration
-- ============================================================

-- ----------------------------------------------------------------
-- users  (profile table that mirrors auth.users)
-- ----------------------------------------------------------------
CREATE TABLE public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- workouts
-- ----------------------------------------------------------------
CREATE TABLE public.workouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  raw_input text NOT NULL DEFAULT '',
  structured_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workouts"
  ON public.workouts FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX workouts_user_id_idx ON public.workouts(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------
-- planned_workouts
-- ----------------------------------------------------------------
CREATE TABLE public.planned_workouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  planned_date date NOT NULL,
  is_locked boolean DEFAULT false NOT NULL,
  is_completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  CONSTRAINT unique_user_planned_date UNIQUE (user_id, planned_date)
);

ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own planned workouts"
  ON public.planned_workouts FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX planned_workouts_user_id_date_idx ON public.planned_workouts(user_id, planned_date);

-- ----------------------------------------------------------------
-- workout_logs
-- ----------------------------------------------------------------
CREATE TABLE public.workout_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  planned_workout_id uuid REFERENCES public.planned_workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_name text NOT NULL,
  set_number integer NOT NULL,
  reps_completed integer NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workout logs"
  ON public.workout_logs
  FOR ALL USING (
    auth.uid() = (
      SELECT user_id FROM public.planned_workouts
      WHERE id = planned_workout_id
    )
  );

CREATE INDEX workout_logs_planned_workout_id_idx ON public.workout_logs(planned_workout_id);
