import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── Authenticate the caller via Supabase JWT ──────────────────────────────
  // SKIP_AUTH=true bypasses JWT verification for local development only.
  // NEVER set this to true in production / deployed functions.
  const skipAuth = Deno.env.get("SKIP_AUTH") === "true";

  if (skipAuth) {
    console.warn("WARNING: SKIP_AUTH is enabled — JWT authentication is bypassed. NEVER use this in production.");
  }

  if (!skipAuth) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header." }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let body: { raw_text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (!body.raw_text || typeof body.raw_text !== "string" || body.raw_text.trim() === "") {
    return new Response(
      JSON.stringify({ error: "Missing required field: raw_text." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── Call Google AI (Gemini) ───────────────────────────────────────────────
  const googleAiApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!googleAiApiKey) {
    return new Response(
      JSON.stringify({ error: "Google AI API key is not configured." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const prompt = `You are a fitness assistant. Parse the following workout text into a structured JSON object.
Return ONLY valid JSON with this structure:
{
  "title": "string — short workout title",
  "exercises": [
    {
      "name": "string",
      "sets": number,
      "reps": number | null,
      "weight": number | null,
      "notes": "string | null"
    }
  ]
}
Do not include any explanation, only the JSON object.

Workout text:
${body.raw_text}`;

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": googleAiApiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to reach Google AI API.", details: String(err) }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    return new Response(
      JSON.stringify({ error: "Google AI API error.", details: errText }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const geminiData = await geminiResponse.json();
  const rawContent: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsedWorkout: unknown;
  try {
    parsedWorkout = JSON.parse(rawContent);
  } catch {
    return new Response(
      JSON.stringify({ error: "Google AI returned invalid JSON.", raw: rawContent }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(parsedWorkout),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
