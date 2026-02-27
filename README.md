# Judy Server

Supabase backend for **Judy** — a mobile-first workout execution app.  
Covers the database schema with RLS policies and the `parseWorkout` Edge Function that converts free-form workout text into structured JSON via OpenAI.

---

## Prerequisites

| Tool | Purpose |
|---|---|
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Local dev & deployments |
| [Docker](https://www.docker.com/) | Required by Supabase local stack |
| Node 18+ | Optional tooling |

---

## Local Development Setup

1. **Login to Supabase**
   ```bash
   supabase login
   ```

2. **Link to your Supabase project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Apply migrations**
   ```bash
   supabase db push
   ```

4. **Run the Edge Function locally**
   ```bash
   supabase functions serve parseWorkout
   ```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in each value before running locally.

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Public anon key — safe to use in mobile clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Full-access key — **server-side only**, never in clients |
| `OPENAI_API_KEY` | OpenAI secret key — **server-side only**, used by the Edge Function |

> ⚠️ The `OPENAI_API_KEY` is consumed exclusively by the `parseWorkout` Edge Function and is never exposed to clients.

---

## Deploying Edge Functions

```bash
supabase functions deploy parseWorkout --no-verify-jwt
```

> **Note:** Despite the `--no-verify-jwt` CLI flag (which disables the automatic gateway-level JWT check), the Edge Function itself reads and trusts the JWT forwarded by the Supabase client. All requests still require a valid user session.

---

## Schema Overview

### `users`
Profile table that mirrors `auth.users`. Automatically populated via the `on_auth_user_created` trigger when a new user signs up.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key, references `auth.users(id)` |
| `email` | `text` | User email address |
| `created_at` | `timestamptz` | Row creation timestamp |

### `workouts`
Stores workout definitions (template + metadata).

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → `users(id)` |
| `title` | `text` | Workout title |
| `raw_input` | `text` | Original free-form text entered by the user |
| `structured_json` | `jsonb` | Parsed workout structure from OpenAI |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Auto-updated on every row update |

### `planned_workouts`
Links a workout to a specific date for a user; enforces one workout per day per user.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → `users(id)` |
| `workout_id` | `uuid` | FK → `workouts(id)` |
| `planned_date` | `date` | Scheduled date |
| `is_locked` | `boolean` | Prevents edits once locked |
| `is_completed` | `boolean` | Completion flag |
| `completed_at` | `timestamptz` | When the workout was completed |

### `workout_logs`
Individual set logs recorded during workout execution.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `planned_workout_id` | `uuid` | FK → `planned_workouts(id)` |
| `exercise_name` | `text` | Name of the exercise |
| `set_number` | `integer` | Set index (1-based) |
| `reps_completed` | `integer` | Reps performed |
| `weight` | `numeric` | Weight used (0 if bodyweight) |
| `created_at` | `timestamptz` | Log timestamp |

---

## Edge Functions

### `parseWorkout`

**Endpoint:** `POST /functions/v1/parseWorkout`

**Request body:**
```json
{ "raw_text": "Bench press 3x10 @ 135lbs, Squat 4x8 @ 185lbs" }
```

**Response:**
```json
{
  "title": "Upper / Lower Strength",
  "exercises": [
    {
      "name": "Bench Press",
      "sets": [
        { "set_number": 1, "reps": 10, "weight": 135 },
        { "set_number": 2, "reps": 10, "weight": 135 },
        { "set_number": 3, "reps": 10, "weight": 135 }
      ]
    }
  ]
}
```

The function calls OpenAI `gpt-4o-mini` server-side. The API key is read from `OPENAI_API_KEY` environment variable and is never exposed to clients.

---

## Row Level Security

All tables have RLS enabled. Every policy is scoped to `auth.uid()`:

| Table | Policy | Operation | Rule |
|---|---|---|---|
| `users` | Users can view own profile | SELECT | `auth.uid() = id` |
| `users` | Users can update own profile | UPDATE | `auth.uid() = id` |
| `workouts` | Users can CRUD own workouts | ALL | `auth.uid() = user_id` |
| `planned_workouts` | Users can CRUD own planned workouts | ALL | `auth.uid() = user_id` |
| `workout_logs` | Users can CRUD own workout logs | ALL | `auth.uid()` matches `user_id` via `planned_workouts` sub-query |

---

## Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| 1 | Database schema + RLS migrations | ✅ This PR |
| 2 | `parseWorkout` Edge Function | ✅ This PR |
| 3 | Workout CRUD API integration | 🔜 Planned |
| 4 | Planned workouts scheduling | 🔜 Planned |
| 5 | Live workout logging | 🔜 Planned |
| 6 | Analytics & history | 🔜 Planned |
