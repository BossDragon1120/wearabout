// WearAbout: backdrop
// Cuts the person out of an outfit photo and places them on a studio or themed background with Photoroom.
// Request (POST JSON, signed-in user): { mode: "studio" | "themed", image: <base64 JPEG>, category, detail }
// Response: the finished image (PNG or JPEG bytes), 1080x1440.
// Secrets: PHOTOROOM_API_KEY (required), PHOTOROOM_BG_MODEL (optional, e.g. background-studio-beta-2025-03-17),
//          BACKDROP_DAILY_LIMIT (optional, default 40 images per person per day).

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// One quiet scene per occasion. Kept soft and uncluttered so the outfit stays the focus.
const SCENES: Record<string, string> = {
  "Beach/Resort": "a quiet beach with pale sand and a soft hazy ocean horizon",
  "Travel Day": "a bright, airy airport terminal with soft daylight",
  "Active/Workout": "a calm park path in soft morning light",
  "Casual/Hangout": "a cozy neighborhood cafe with warm window light",
  "Errands": "a quiet tree-lined city sidewalk with small shopfronts",
  "WFH": "a bright minimal living room with plants and soft daylight",
  "Office": "a modern office lobby in soft neutral tones",
  "Work Event": "an elegant conference venue foyer with warm lighting",
  "Get Fancy": "an elegant venue with soft warm evening light",
  "Night Out": "a city street at dusk with soft warm bokeh lights",
  "Festival": "an outdoor festival field at golden hour",
};

function themedPrompt(category: string, detail: string) {
  const scene = SCENES[category] ?? "a softly lit, uncluttered everyday setting";
  const lead = detail ? `A setting that suggests ${detail}: ` : "";
  return `${lead}${scene}. Softly blurred background, muted natural colors, shallow depth of field, ` +
    `photorealistic, uncluttered, no other people, no text.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Use POST." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user) return json(401, { error: "Sign in again." });

  const key = Deno.env.get("PHOTOROOM_API_KEY");
  if (!key) return json(500, { error: "Photoroom isn't set up yet (missing PHOTOROOM_API_KEY)." });

  let body: { mode?: string; image?: string; category?: string; detail?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Bad request." }); }
  const mode = body.mode === "themed" ? "themed" : "studio";
  const category = String(body.category ?? "").slice(0, 40);
  const detail = String(body.detail ?? "").slice(0, 60);
  if (!body.image || body.image.length > 8_000_000) return json(400, { error: "Missing or oversized photo." });

  // Daily cap so a shared app can't run up the Photoroom bill.
  const limit = Number(Deno.env.get("BACKDROP_DAILY_LIMIT") ?? 40);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from("ai_usage").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("kind", "backdrop").gte("created_at", since);
  if ((count ?? 0) >= limit) return json(429, { error: "You've hit today's backdrop limit. Try again tomorrow." });
  await admin.from("ai_usage").insert({ user_id: user.id, kind: "backdrop" });

  const bytes = Uint8Array.from(atob(body.image), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("imageFile", new Blob([bytes], { type: "image/jpeg" }), "fit.jpg");
  form.append("outputSize", "1080x1440");
  form.append("padding", "0.07");
  // Keep clothing colors true to life while evening out the light.
  form.append("lighting.mode", "ai.preserve-hue-and-saturation");

  const headers: Record<string, string> = { "x-api-key": key };
  if (mode === "studio") {
    form.append("background.color", "F2F1EE");
    form.append("shadow.mode", "ai.soft");
  } else {
    form.append("background.prompt", themedPrompt(category, detail));
    form.append("background.seed", "117879368");
    const model = Deno.env.get("PHOTOROOM_BG_MODEL");
    if (model) headers["pr-ai-background-model-version"] = model;
  }

  const res = await fetch("https://image-api.photoroom.com/v2/edit", { method: "POST", headers, body: form });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    console.error("photoroom", res.status, text);
    const msg = res.status === 402 ? "The Photoroom account is out of credits." :
      res.status === 429 ? "Photoroom is busy. Try again in a minute." :
      "Photoroom couldn't edit this photo. Try a clearer full-length shot.";
    return json(502, { error: msg });
  }
  return new Response(res.body, {
    headers: { ...CORS, "Content-Type": res.headers.get("Content-Type") ?? "image/png", "Cache-Control": "no-store" },
  });
});
