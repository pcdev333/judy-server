import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a workout parser. Parse the user's raw workout text into structured JSON.
Always return valid JSON matching this exact schema:
{
  "title": "descriptive workout title",
  "exercises": [
    {
      "name": "exercise name",
      "sets": [
        { "set_number": 1, "reps": 10, "weight": 135 }
      ]
    }
  ]
}
If weight is not mentioned, default to 0. If reps are not mentioned, default to 0.
Return ONLY the JSON object, no markdown, no explanation.`;

serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body = await req.json();
    const rawText: string | undefined = body?.raw_text;

    if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
      return new Response(
        JSON.stringify({ error: "raw_text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Retrieve OpenAI API key from environment (never hard-coded)
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call OpenAI Chat Completions
    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: rawText },
          ],
          temperature: 0,
        }),
      },
    );

    if (!openAiResponse.ok) {
      const errorBody = await openAiResponse.text();
      console.error("OpenAI error:", errorBody);
      return new Response(
        JSON.stringify({ error: "Failed to call OpenAI API" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const openAiData = await openAiResponse.json();
    const content: string =
      openAiData?.choices?.[0]?.message?.content ?? "";

    // Parse the JSON returned by OpenAI
    let structured;
    try {
      structured = JSON.parse(content);
    } catch {
      console.error("Failed to parse OpenAI response as JSON:", content);
      return new Response(
        JSON.stringify({
          error: "OpenAI returned non-JSON response",
          raw: content,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(structured), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
