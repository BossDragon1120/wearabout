// WearAbout server function (one function for everything the app needs from AI).
// Deploy it in Supabase under the name: wear-about
//
// Request: POST JSON from a signed-in user, with an "action":
//   { action: "guess",    image }                                -> { category, confidence }          (Claude)
//   { action: "analyze",  image, category, detail, goal, closet, buy } -> { score, dims, low, review, ... } (Claude)
//      buy = false turns off the purchase recommendation
//      closet = [{ id, label, type }] of the user's existing pieces; each returned item gets "match": an id or null
//   { action: "backdrop", image, mode: "studio"|"themed", category, detail } -> finished image bytes (Photoroom)
//   image = base64 JPEG of the outfit photo.
//
// Secrets (Edge Functions > Secrets):
//   ANTHROPIC_API_KEY   required, for the occasion guess, score, recs and items
//   PHOTOROOM_API_KEY   required, for cut-out and backdrops
//   Optional: CLAUDE_MODEL (default claude-sonnet-5-5), CLAUDE_FAST_MODEL (default claude-haiku-5-5),
//             PHOTOROOM_BG_MODEL (e.g. background-studio-beta-2025-03-17),
//             STYLE_DAILY_LIMIT (default 60 Claude calls per person per day),
//             BACKDROP_DAILY_LIMIT (default 40 Photoroom images per person per day).

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* ------------------------------------------------------------------ shared lists */

const CATS = ["Casual/Hangout", "Errands", "Office", "WFH", "Active/Workout", "Night Out", "Work Event",
  "Get Fancy", "Travel Day", "Festival", "Beach/Resort"];
const DIMS: [string, number][] = [["occasion_fit", .30], ["cohesion", .20], ["proportion", .20], ["color", .20], ["details", .10]];
// With a personal style goal, the goal takes 10%: 5 points from occasion fit and 5 from color.
const DIMS_GOAL: [string, number][] = [["occasion_fit", .25], ["cohesion", .20], ["proportion", .20], ["color", .15], ["details", .10], ["goal", .10]];
const BADGES = ["Nailed the occasion", "Color play", "Great proportions", "Texture mix", "Statement piece", "Polished details", "Tonal dressing", "Pattern mixing", "On goal"];
const badgeNames = (goal: string) => BADGES.filter((n) => goal || n !== "On goal");
const ITEM_TYPES = ["top", "bottom", "dress", "jacket", "outerwear", "shoes", "bag", "belt", "hat", "scarf", "eyewear", "other"];

/* ------------------------------------------------------------------ Claude: occasion, score, recs, items */

const guessPrompt = () => `This photo shows a person's outfit. Guess what occasion they are dressed for, based only on the clothing you can see.
Choose exactly one category from this list: ${CATS.join(", ")}.
If the photo doesn't clearly suggest one, still pick the closest and mark confidence "low".
Reply with only JSON: {"category":"<one category from the list, spelled exactly>","confidence":"high"|"medium"|"low"}`;

const closetBlock = (refs: { ref: string; label: string; type: string }[]) => refs.length ? `

The user's closet so far (ref: label [type]):
${refs.map((r) => `${r.ref}: ${r.label} [${r.type}]`).join("\n")}
For each item you list, add "match": the ref of the closet piece it is clearly the same garment as (same kind of item, color, material and details), or null if it is new or you are not sure. Only match when you are confident; a wrong match is worse than a duplicate. Never match two items in this outfit to the same ref.` : "";

const analyzePrompt = (cat: string, detail: string, goal: string, closet = "", buy = true) => `You are the stylist inside WearAbout, an outfit-logging app. The photo shows the user's outfit. They are dressed for: ${cat}${detail ? ` (${detail})` : ""}.

Rules you must follow:
1. Never make things up. Name a brand or model only when a visible logo or an unmistakable design makes you confident; otherwise describe the item by color, material and garment type. If you can't tell something, leave it out. A wrong guess is worse than not knowing.
2. Be kind and helpful. Talk only about the clothes and styling, never the person's body, face, weight, age or looks. Frame everything as making a good look even better. Kind does not mean inflated: score honestly.
3. Help, don't sell. ${buy ? `Always give exactly one purchase idea: the single kind of item that would most improve this outfit for this occasion. Keep it practical and versatile, never a brand you made up.` : `The user has turned off purchase recommendations. Do not suggest buying anything; set "buy" to null.`}

Score each dimension from 1 to 10 (one decimal allowed), with a note of at most 14 words:
- occasion_fit: right formality and practicality for ${cat}
- cohesion: the pieces read as one intentional look
- proportion: silhouette, lengths and volumes balance; garments fit well
- color: the palette works together and with the wearer
- details: accessories, shoes, grooming and polish
${goal ? `- goal: how well the outfit moves toward the user's own style goal, "${goal}"
` : ""}
"tweak": one change using things they likely already own (styling, tucking, cuffing, swapping a piece, layering, hair). It must improve the lowest-scoring dimension. "title" at most 8 words, "detail" at most 30 words, "dimension" is that dimension's key.
${buy ? `"buy": {"item": the kind of item, described specifically without inventing a brand, "why": at most 25 words, "search": a 3-7 word Google search for it}.` : `"buy": null.`}
"review": one or two warm, specific sentences on what works.
"badges": 0 to 3 badges from this exact list, only when clearly earned (many outfits earn none): ${badgeNames(goal).join(", ")}.${goal ? ` "On goal" means the outfit clearly delivers on "${goal}".` : ""}
"items": every wardrobe item you can see, excluding jewelry. Each {"label": specific, like "tan suede Chelsea boots", "type": one of ${ITEM_TYPES.join(", ")} (use "jacket" for jackets, blazers, shackets and cardigans worn open; "outerwear" for coats, parkas and puffers), "brand": a string only if you are confident, else null, "clear": true only if the whole piece is plainly visible and you are certain of its type, color and material; false if it is partly hidden (for example shoes under long pants), cropped, blurry, in shadow, or you are unsure, "box": only when "clear" is true, the piece's position as [left, top, right, bottom] fractions of the photo's width and height (0 to 1), drawn tightly around that piece alone; otherwise null}.
If no outfit is visible, reply {"error":"<short reason>"} instead.${closet}

Reply with only JSON in this shape:
{"dims":{"occasion_fit":{"score":8,"note":"..."},"cohesion":{"score":7.5,"note":"..."},"proportion":{"score":7,"note":"..."},"color":{"score":8,"note":"..."},"details":{"score":6.5,"note":"..."}${goal ? ',"goal":{"score":7,"note":"..."}' : ""}},"review":"...","badges":[],"tweak":{"title":"...","detail":"...","dimension":"details"},"buy":${buy ? '{"item":"...","why":"...","search":"..."}' : "null"},"items":[{"label":"...","type":"top","brand":null,"clear":true,"box":[0.3,0.2,0.7,0.55]${closet ? ',"match":null' : ""}}]}`;

function parseJson(text: string) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* fall through */ } }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
  throw new Error("no json");
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

// A usable crop box: four fractions, in order, covering a sensible part of the photo.
function cleanBox(b: unknown): number[] | null {
  if (!Array.isArray(b) || b.length !== 4) return null;
  const [l, t, r, btm] = b.map(Number);
  if (![l, t, r, btm].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) return null;
  // Thin pieces are fine (a belt is only 2-3% of a full-length photo's height), as long as the box isn't a sliver or the whole photo.
  const w = r - l, h = btm - t;
  if (Math.max(w, h) < 0.04 || Math.min(w, h) < 0.008 || w * h > 0.9) return null;
  return [l, t, r, btm].map((n) => Math.round(n * 1000) / 1000);
}

// deno-lint-ignore no-explicit-any
function normalize(a: any, goal: string, refMap: Record<string, string> = {}, buyOn = true) {
  if (!a || typeof a !== "object" || a.error || !a.dims) throw new Error(a?.error ? String(a.error) : "No outfit found");
  const dims: Record<string, { score: number; note: string }> = {};
  let total = 0, low = "";
  for (const [k, w] of (goal ? DIMS_GOAL : DIMS)) {
    const d = a.dims[k] ?? {};
    const sc = clamp(Number(d.score) || 5, 1, 10);
    dims[k] = { score: round1(sc), note: String(d.note ?? "").slice(0, 160) };
    total += sc * w;
    if (!low || sc < dims[low].score) low = k;
  }
  const t = a.tweak ?? {};
  const tweak = t.title ? { title: String(t.title).slice(0, 90), detail: String(t.detail ?? "").slice(0, 260), dimension: dims[t.dimension] ? t.dimension : low } : null;
  const b = a.buy;
  const buy = buyOn && b && b.item ? { item: String(b.item).slice(0, 120), why: String(b.why ?? "").slice(0, 220), search: String(b.search ?? b.item).slice(0, 90) } : null;
  // deno-lint-ignore no-explicit-any
  const items = Array.isArray(a.items) ? a.items.filter((i: any) => i && i.label).slice(0, 20).map((i: any) => ({
    label: String(i.label).slice(0, 80), type: ITEM_TYPES.includes(i.type) ? i.type : "other", brand: i.brand ? String(i.brand).slice(0, 40) : null,
    clear: i.clear === true,
    box: i.clear === true ? cleanBox(i.box) : null,
    match: refMap[String(i.match ?? "")] ?? null,
  })) : [];
  // One closet piece can only be worn once per outfit: keep the first match, drop repeats.
  const used = new Set<string>();
  for (const it of items) { if (it.match) { if (used.has(it.match)) it.match = null; else used.add(it.match); } }
  const names = badgeNames(goal);
  const badges = Array.isArray(a.badges) ? [...new Set(a.badges.map(String).filter((n: string) => names.includes(n)))].slice(0, 3) : [];
  return { score: round1(total), dims, low, review: String(a.review ?? "").slice(0, 320), tweak, buy, buyOff: !buyOn, items, badges, goal };
}

async function askClaude(key: string, model: string, image: string, prompt: string, maxTokens: number) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
        { type: "text", text: prompt },
      ] }],
    }),
  });
  if (!res.ok) {
    console.error("anthropic", res.status, (await res.text()).slice(0, 300));
    throw Object.assign(new Error("Claude request failed"), { status: res.status });
  }
  const data = await res.json();
  return (data.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
}

/* ------------------------------------------------------------------ Photoroom: cut-out and backdrops */

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

async function backdrop(key: string, image: string, mode: string, category: string, detail: string) {
  const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("imageFile", new Blob([bytes], { type: "image/jpeg" }), "fit.jpg");
  form.append("outputSize", "1080x1440");
  form.append("padding", "0.07");
  // JPEG instead of the default PNG: the backdrop fills the frame, so no transparency is needed,
  // and the file is several times smaller, so it reaches the phone much faster.
  form.append("export.format", "jpeg");
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
    console.error("photoroom", res.status, (await res.text()).slice(0, 300));
    const msg = res.status === 402 ? "The Photoroom account is out of credits." :
      res.status === 429 ? "Photoroom is busy. Try again in a minute." :
      "Photoroom couldn't edit this photo. Try a clearer full-length shot.";
    return json(502, { error: msg });
  }
  return new Response(res.body, {
    headers: { ...CORS, "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "no-store" },
  });
}

/* ------------------------------------------------------------------ request handling */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Use POST." });

  // Only signed-in WearAbout users can spend the AI credit.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  type Body = { action?: string; image?: string; mode?: string; category?: string; detail?: string; goal?: string; buy?: boolean; closet?: { id?: string; label?: string; type?: string }[] };
  // Check the sign-in and read the photo at the same time.
  const [auth, body] = await Promise.all([
    token ? admin.auth.getUser(token) : Promise.resolve({ data: { user: null } }),
    req.json().catch(() => null) as Promise<Body | null>,
  ]);
  const user = auth.data.user;
  if (!user) return json(401, { error: "Sign in again." });
  if (!body) return json(400, { error: "Bad request." });
  if (!body.image || body.image.length > 8_000_000) return json(400, { error: "Missing or oversized photo." });

  const isBackdrop = body.action === "backdrop";
  const apiKey = Deno.env.get(isBackdrop ? "PHOTOROOM_API_KEY" : "ANTHROPIC_API_KEY");
  if (!apiKey) return json(500, { error: isBackdrop ? "Photoroom isn't set up yet (missing PHOTOROOM_API_KEY)." : "Claude isn't set up yet (missing ANTHROPIC_API_KEY)." });

  // Daily caps per person so a shared app can't run up the bills.
  const kind = isBackdrop ? "backdrop" : "style";
  const limit = Number(Deno.env.get(isBackdrop ? "BACKDROP_DAILY_LIMIT" : "STYLE_DAILY_LIMIT") ?? (isBackdrop ? 40 : 60));
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from("ai_usage").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("kind", kind).gte("created_at", since);
  if ((count ?? 0) >= limit) return json(429, { error: `You've hit today's ${isBackdrop ? "backdrop" : "styling"} limit. Try again tomorrow.` });
  await admin.from("ai_usage").insert({ user_id: user.id, kind });
  // Now and then, clear this person's usage rows older than two days so the table stays small. Not awaited.
  if (Math.random() < 0.05) {
    admin.from("ai_usage").delete().eq("user_id", user.id).lt("created_at", new Date(Date.now() - 2 * 864e5).toISOString())
      .then(({ error }) => { if (error) console.error("usage cleanup", error.message); });
  }

  const category = CATS.includes(String(body.category)) ? String(body.category) : "Casual/Hangout";
  const detail = String(body.detail ?? "").slice(0, 60);

  if (isBackdrop) return backdrop(apiKey, body.image, body.mode === "themed" ? "themed" : "studio", category, detail);

  const model = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5-5";
  const fast = Deno.env.get("CLAUDE_FAST_MODEL") ?? "claude-haiku-5-5";
  try {
    if (body.action === "guess") {
      const out = parseJson(await askClaude(apiKey, fast, body.image, guessPrompt(), 200));
      const guessed = CATS.find((c) => c.toLowerCase() === String(out?.category ?? "").toLowerCase()) ?? null;
      return json(200, { category: guessed, confidence: out?.confidence ?? "low" });
    }
    const goal = String(body.goal ?? "").replace(/["\n]/g, " ").trim().slice(0, 40);
    // Short refs (c1, c2...) keep the prompt small; map them back to real ids afterwards.
    const refMap: Record<string, string> = {};
    const refs = (Array.isArray(body.closet) ? body.closet : []).slice(0, 250)
      .filter((c) => c && c.id && c.label)
      .map((c, i) => {
        const ref = `c${i + 1}`; refMap[ref] = String(c.id);
        return { ref, label: String(c.label).replace(/[\n\r]/g, " ").slice(0, 80), type: ITEM_TYPES.includes(String(c.type)) ? String(c.type) : "other" };
      });
    const buyOn = body.buy !== false;
    const text = await askClaude(apiKey, model, body.image, analyzePrompt(category, detail, goal, closetBlock(refs), buyOn), 2400);
    return json(200, normalize(parseJson(text), goal, refMap, buyOn));
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 429 || status === 529) return json(503, { error: "Claude is busy. Try again in a minute." });
    const msg = String((e as Error).message ?? "");
    if (msg && !/request failed|no json/i.test(msg)) return json(422, { error: `Couldn't score this photo: ${msg}` });
    return json(502, { error: "The style review didn't come back. Try again." });
  }
});
