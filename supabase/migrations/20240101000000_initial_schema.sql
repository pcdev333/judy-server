-- ============================================================
-- Judy – Initial Schema
-- Phase 1 & 2: Tables, RLS Policies, Triggers, Indexes
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. users  (profile extension of auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: select own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Auto-insert profile row when a new auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. workouts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.workouts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  raw_input       TEXT,
  structured_json JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workouts: select own rows"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "workouts: insert own rows"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts: update own rows"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "workouts: delete own rows"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workouts_set_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. planned_workouts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.planned_workouts (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_id   UUID    NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  planned_date DATE    NOT NULL,
  is_locked    BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, planned_date)
);

ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_workouts: select own rows"
  ON public.planned_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "planned_workouts: insert own rows"
  ON public.planned_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "planned_workouts: update own rows"
  ON public.planned_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "planned_workouts: delete own rows"
  ON public.planned_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. workout_logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.workout_logs (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_workout_id  UUID    NOT NULL REFERENCES public.planned_workouts(id) ON DELETE CASCADE,
  exercise_name       TEXT    NOT NULL,
  set_number          INTEGER NOT NULL,
  reps_completed      INTEGER,
  weight              NUMERIC,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_logs: select own rows"
  ON public.workout_logs FOR SELECT
  USING (
    planned_workout_id IN (
      SELECT id FROM public.planned_workouts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_logs: insert own rows"
  ON public.workout_logs FOR INSERT
  WITH CHECK (
    planned_workout_id IN (
      SELECT id FROM public.planned_workouts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_logs: update own rows"
  ON public.workout_logs FOR UPDATE
  USING (
    planned_workout_id IN (
      SELECT id FROM public.planned_workouts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_logs: delete own rows"
  ON public.workout_logs FOR DELETE
  USING (
    planned_workout_id IN (
      SELECT id FROM public.planned_workouts WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_planned_workouts_user_date ON public.planned_workouts (user_id, planned_date);
CREATE INDEX idx_workouts_user_id           ON public.workouts          (user_id);
CREATE INDEX idx_workout_logs_planned_id    ON public.workout_logs      (planned_workout_id);
