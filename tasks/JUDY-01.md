# JUDY-01 — Supabase Hosted Project Setup

> **Who is this for?** Complete beginners — no prior technical knowledge required.
> Follow every step in order. Do not skip any step.

---

## Overview

Before the Judy app can work on your phone, you need to:
1. Create a free cloud database (Supabase)
2. Push your database tables to it
3. Set up login (Magic Link email)
4. Deploy the AI workout parser function
5. Connect your mobile app to the cloud

Estimated time: **30–45 minutes**

---

## Prerequisites — What You Need First

Before starting, make sure you have the following installed on your computer.

### A. Node.js
Node.js lets you run JavaScript on your computer and is required for the Supabase CLI.

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the one that says "Recommended For Most Users")
3. Run the installer and follow the on-screen steps
4. Verify it worked — open your terminal and run:
   ```bash
   node --version
   ```
   You should see something like `v20.x.x`. If you do, Node.js is installed. ✅

### B. Supabase CLI
The Supabase CLI is a tool that lets you push your database tables and deploy functions from your terminal.

1. Open your terminal
2. Run:
   ```bash
   npm install -g supabase
   ```
3. Verify it worked:
   ```bash
   supabase --version
   ```
   You should see a version number like `1.x.x`. ✅

> **What is a terminal?**
> - On **Mac**: press `Cmd + Space`, type `Terminal`, press Enter
> - On **Windows**: press `Windows key`, type `PowerShell`, press Enter
> - On **Linux**: press `Ctrl + Alt + T`

### C. Git
Git is used to download the project code to your computer.

1. Go to [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Download and install Git for your operating system
3. Verify it worked:
   ```bash
   git --version
   ```
   You should see something like `git version 2.x.x`. ✅

---

## Step 1 — Create a Free Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with your **GitHub account** (easiest) or email
4. Once logged in, you will see the Supabase Dashboard

---

## Step 2 — Create a New Supabase Project

1. On the Supabase Dashboard, click **"New project"**
2. Fill in the form:
   - **Name**: `judy`
   - **Database Password**: Choose a strong password and **save it somewhere safe** (e.g. in a notes app). You will need this later.
   - **Region**: Choose the region closest to you (e.g. `US East`, `EU West`)
   - **Pricing Plan**: Select **Free**
3. Click **"Create new project"**
4. Wait 1–2 minutes while Supabase sets up your project. You will see a loading screen.

---

## Step 3 — Get Your Project Credentials

Once your project is ready, you need to copy two values: your **Project URL** and **Anon Key**.

1. In your Supabase project, click **"Project Settings"** (gear icon in the left sidebar)
2. Click **"API"** in the settings menu
3. You will see:
   - **Project URL** — looks like `https://abcdefghijklm.supabase.co`
   - **anon / public key** — a long string starting with `eyJ...`
4. Copy both values and save them somewhere safe. You will need them shortly.

---

## Step 4 — Download the Project Code

1. Open your terminal
2. Navigate to where you want to store the project. For example, your Desktop:
   ```bash
   cd ~/Desktop
   ```
3. Clone the backend repository:
   ```bash
   git clone https://github.com/pcdev333/judy-server.git
   ```
4. Move into the project folder:
   ```bash
   cd judy-server
   ```

---

## Step 5 — Set Up Your Environment Variables

Environment variables are secret values your app needs to run. They are stored in a `.env` file that is **never uploaded to GitHub**.

1. In the `judy-server` folder, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file in a text editor. On Mac you can run:
   ```bash
   open .env
   ```
   On Windows:
   ```bash
   notepad .env
   ```
3. Fill in the values you copied in Step 3:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=eyJ...your-anon-key...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
   OPENAI_API_KEY=sk-...your-openai-key...
   ```
   > **Where is the Service Role Key?**
   > Same place as the Anon Key — in Project Settings → API → `service_role` key. Keep this one **extra secret** — it bypasses all security rules.
4. Save and close the file

---

## Step 6 — Log In to Supabase CLI

1. In your terminal (make sure you are still in the `judy-server` folder), run:
   ```bash
   supabase login
   ```
2. It will open a browser window asking you to log in to Supabase
3. Click **"Authorize"**
4. Return to your terminal — you should see `Logged in as yourname@email.com` ✅

---

## Step 7 — Link CLI to Your Supabase Project

1. Go back to the Supabase Dashboard
2. Click **"Project Settings"** → **"General"**
3. Copy your **Reference ID** — it looks like `abcdefghijklm`
4. In your terminal, run (replace `YOUR_PROJECT_REF` with your actual Reference ID):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
5. It will ask for your **Database Password** — enter the one you saved in Step 2
6. You should see `Finished supabase link.` ✅

---

## Step 8 — Push the Database Schema

This step creates all your database tables (users, workouts, planned_workouts, workout_logs) in your hosted Supabase project.

1. In your terminal, run:
   ```bash
   supabase db push
   ```
2. You will see a list of migrations being applied. Wait for it to finish.
3. You should see `Schema migrations applied successfully` ✅

**Verify it worked:**
1. Go to your Supabase Dashboard
2. Click **"Table Editor"** in the left sidebar
3. You should see 4 tables: `users`, `workouts`, `planned_workouts`, `workout_logs` ✅

---

## Step 9 — Configure Authentication (Magic Link)

This sets up the email login system so users can log in with a magic link.

1. In your Supabase Dashboard, click **"Authentication"** in the left sidebar
2. Click **"URL Configuration"**
3. Fill in the following:
   - **Site URL**: `judy://auth/callback`
   - **Redirect URLs**: Click **"Add URL"** and add:
     - `judy://auth/callback`
     - `exp://localhost:8081` *(for local development)*
4. Click **"Save"**
5. Click **"Providers"** in the Authentication menu
6. Make sure **"Email"** is enabled (it should be on by default)
7. Under Email settings, make sure **"Enable Email OTP"** or **"Magic Links"** is turned on ✅

---

## Step 10 — Get an OpenAI API Key

The AI workout parser uses OpenAI. You need an API key.

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Click your profile icon (top right) → **"API keys"**
4. Click **"Create new secret key"**
5. Give it a name like `judy-app`
6. Copy the key — it starts with `sk-`. **Save it now** — you cannot see it again after closing the dialog.

> **Cost note:** We use `gpt-4o-mini` which is the cheapest capable model. For personal use, costs are typically under $1/month.

---

## Step 11 — Set the OpenAI Secret in Supabase

The OpenAI key must be stored as a Supabase secret so it is **never** exposed to the mobile app.

1. In your terminal, run (replace `sk-...` with your actual key):
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...your-key-here...
   ```
2. You should see `Finished setting secret` ✅

---

## Step 12 — Deploy the Edge Function

The Edge Function is the server-side AI parser. Deploy it to Supabase now.

1. In your terminal, run:
   ```bash
   supabase functions deploy parseWorkout
   ```
2. Wait for the deployment to finish
3. You should see `Deployed Function parseWorkout` ✅

**Verify it worked:**
1. Go to your Supabase Dashboard
2. Click **"Edge Functions"** in the left sidebar
3. You should see `parseWorkout` listed with a green status ✅

---

## Step 13 — Connect the Mobile App to Supabase

Now you need to add your Supabase credentials to the mobile app (`judy-ui`).

1. Open a new terminal window
2. Navigate to your `judy-ui` folder:
   ```bash
   cd ~/Desktop/judy-ui
   ```
   *(Or wherever you cloned it)*
3. Copy the env example file:
   ```bash
   cp .env.example .env
   ```
4. Open the `.env` file and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
   ```
   > Use the same **Project URL** and **Anon Key** from Step 3.
   > **Never put the Service Role Key in the mobile app.**
5. Save the file ✅

---

## Step 14 — Test Everything Works

1. Start the mobile app:
   ```bash
   npx expo start
   ```
2. Scan the QR code with the **Expo Go** app on your phone
   - Download Expo Go from the [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
3. You should see the **Auth screen** (email input + magic link button)
4. Enter your email address and tap **"Send Magic Link"**
5. Check your email inbox — you should receive a magic link email within 1 minute
6. Tap the link — you should be redirected to the app and logged in ✅

---

## Troubleshooting

### "supabase: command not found"
The Supabase CLI is not installed or not in your PATH. Re-run:
```bash
npm install -g supabase
```
Then close and reopen your terminal.

### "Error: Invalid JWT"
Your Supabase URL or Anon Key in `.env` is incorrect. Double-check Step 3 and Step 13.

### Magic link email not arriving
- Check your spam/junk folder
- Make sure you saved the correct Site URL in Step 9
- Wait up to 5 minutes (email delivery can be slow)

### "parseWorkout function not found"
Re-run Step 12. Make sure you are in the `judy-server` folder when deploying.

### Database tables not showing up
Re-run Step 8. If it fails, check that your database password is correct.

---

## Summary Checklist

Use this to track your progress:

- [ ] Step 1 — Created Supabase account
- [ ] Step 2 — Created `judy` project
- [ ] Step 3 — Copied Project URL and Anon Key
- [ ] Step 4 — Cloned `judy-server` repo
- [ ] Step 5 — Created `.env` file with credentials
- [ ] Step 6 — Logged in to Supabase CLI
- [ ] Step 7 — Linked CLI to Supabase project
- [ ] Step 8 — Pushed database schema (4 tables visible in dashboard)
- [ ] Step 9 — Configured Magic Link auth and redirect URLs
- [ ] Step 10 — Got OpenAI API key
- [ ] Step 11 — Set `OPENAI_API_KEY` as Supabase secret
- [ ] Step 12 — Deployed `parseWorkout` Edge Function
- [ ] Step 13 — Connected `judy-ui` to Supabase
- [ ] Step 14 — Tested login with magic link ✅

---

## What's Next?

Once all steps above are complete, your backend is **fully live**. The next steps in the development roadmap are:

| Phase | Description |
|---|---|
| Phase 3 | Create Workout screen + AI parsing (in progress) |
| Phase 4 | Planner screen — 7-day calendar + lock logic |
| Phase 5 | Workout Execution screen + rest timer |
| Phase 6 | Streak tracking + momentum display |

---

*Last updated: Phase 3 — February 2026*