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

  // ── Call OpenAI ───────────────────────────────────────────────────────────
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiApiKey) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key is not configured." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = `You are a fitness assistant. Parse the following workout text into a structured JSON object.
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
Do not include any explanation, only the JSON object.`;

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.raw_text },
        ],
        temperature: 0,
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to reach OpenAI API.", details: String(err) }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (!openAiResponse.ok) {
    const errText = await openAiResponse.text();
    return new Response(
      JSON.stringify({ error: "OpenAI API error.", details: errText }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const openAiData = await openAiResponse.json();
  const rawContent: string = openAiData?.choices?.[0]?.message?.content ?? "";

  let parsedWorkout: unknown;
  try {
    parsedWorkout = JSON.parse(rawContent);
  } catch {
    return new Response(
      JSON.stringify({ error: "OpenAI returned invalid JSON.", raw: rawContent }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(parsedWorkout),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
