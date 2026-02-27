# Judy Server

Supabase backend for **Judy** — a mobile-first workout execution app.

This repository contains:
- PostgreSQL database migrations (schema + Row Level Security)
- Supabase Edge Functions (server-side OpenAI integration)
- Local development configuration

---

## Prerequisites

- [Docker](https://www.docker.com/get-started) (required for local development)
- [Node.js](https://nodejs.org/) v18+ (required to install the Supabase CLI)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)

---

## Installing Prerequisites on Linux (clean environment)

Run the following commands on a fresh Linux machine to install all required dependencies.

### 1. Install Docker Engine

```bash
# Install Docker using the official convenience script
curl -fsSL https://get.docker.com | sh

# Allow your user to run Docker without sudo
sudo usermod -aG docker $USER

# Apply the new group membership without logging out
newgrp docker

# Verify Docker is running
docker run hello-world
```

### 2. Install Node.js (via nvm)

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell profile (use ~/.zshrc if you are using zsh, etc.)
source ~/.bashrc

# Install the latest LTS release of Node.js
nvm install --lts

# Verify installation
node --version
npm --version
```

### 3. Install the Supabase CLI

```bash
npm install -g supabase

# Verify installation
supabase --version
```

---

## Local Development Setup

```bash
# 1. Clone the repository and enter the project directory
git clone https://github.com/pcdev333/judy-server.git
cd judy-server

# 2. Copy the example environment file and fill in your values
cp .env.example .env

# 3. Log in to Supabase CLI
supabase login

# 4. Start the local Supabase stack (requires Docker)
supabase start

# 5. Apply migrations and seed data
supabase db reset

# 6. Serve the Edge Function locally
supabase functions serve parseWorkout
```

> **Note:** `supabase start` will print local API URLs and keys to your terminal once the stack is ready. You can use those values to populate your `.env` file for local testing.

---

## Deploying to Supabase (Hosted)

```bash
# 1. Push migrations to your hosted project
supabase db push

# 2. Deploy the Edge Function
supabase functions deploy parseWorkout

# 3. Set the OpenAI secret (NEVER commit this value)
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## Database Schema

### `users`
Profile extension of `auth.users`. Auto-populated via trigger when a new user signs up.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, FK → `auth.users(id)` |
| `email` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### `workouts`
Stores raw and parsed workout definitions.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` |
| `title` | TEXT | |
| `raw_input` | TEXT | Original text from user |
| `structured_json` | JSONB | Output from `parseWorkout` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

### `planned_workouts`
Links a workout to a specific date on a user's calendar.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users(id)` |
| `workout_id` | UUID | FK → `workouts(id)` |
| `planned_date` | DATE | Unique per user |
| `is_locked` | BOOLEAN | |
| `is_completed` | BOOLEAN | |
| `completed_at` | TIMESTAMPTZ | |

### `workout_logs`
Individual set/rep logs recorded during a workout session.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `planned_workout_id` | UUID | FK → `planned_workouts(id)` |
| `exercise_name` | TEXT | |
| `set_number` | INTEGER | |
| `reps_completed` | INTEGER | |
| `weight` | NUMERIC | |
| `created_at` | TIMESTAMPTZ | |

---

## Edge Functions

### `parseWorkout`

**POST** `/functions/v1/parseWorkout`

Parses raw workout text into structured JSON using OpenAI `gpt-4o-mini`.

**Headers**
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request body**
```json
{ "raw_text": "Bench press 3x10 @ 135lbs, Squat 4x8 @ 185lbs" }
```

**Response**
```json
{
  "title": "Strength Training",
  "exercises": [
    { "name": "Bench Press", "sets": 3, "reps": 10, "weight": 135, "notes": null },
    { "name": "Squat", "sets": 4, "reps": 8, "weight": 185, "notes": null }
  ]
}
```

The function validates the caller's Supabase JWT before forwarding to OpenAI. The OpenAI API key is stored as a Supabase secret and is **never** exposed to clients.

---

## Security

- **Row Level Security (RLS)** is enabled on all tables. Every policy is scoped to `auth.uid()` so users can only access their own data.
- `workout_logs` access is gated via a subquery through `planned_workouts`, ensuring the ownership chain is enforced even without a direct `user_id` column.
- The **OpenAI API key** exists only as a Supabase secret (`supabase secrets set`). It is never stored in the repo or exposed to any client.
- All Edge Function requests must include a valid `Authorization: Bearer <jwt>` header issued by Supabase Auth.

---

## Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| 1 | Project setup (Supabase init, config) | ✅ Done |
| 2 | DB schema + RLS policies + triggers | ✅ Done |
| 3 | `parseWorkout` Edge Function skeleton | ✅ Done |
| 4 | Auth flow (Magic Link / OTP) integration | 🔜 Planned |
| 5 | Mobile app API integration | 🔜 Planned |
| 6 | Analytics & reporting queries | 🔜 Planned |
