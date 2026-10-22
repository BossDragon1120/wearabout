// WearAbout: style-fit
// Uses Claude to guess the occasion, then score the outfit, write one tweak and (maybe) one buy rec, and list items.
// Request (POST JSON, signed-in user):
//   { action: "guess",   image: <base64 JPEG> }                      -> { category, confidence }
//   { action: "analyze", image: <base64 JPEG>, category, detail }    -> { score, dims, low, review, tweak, buy, items }
// Secrets: ANTHROPIC_API_KEY (required), CLAUDE_MODEL / CLAUDE_FAST_MODEL (optional),
//          STYLE_DAILY_LIMIT (optional, default 60 calls per person per day).

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const CATS = ["Beach/Resort", "Travel Day", "Active/Workout", "Casual/Hangout", "Errands", "WFH", "Office",
  "Work Event", "Get Fancy", "Night Out", "Festival"];
const DIMS: [string, number][] = [["occasion_fit", .30], ["cohesion", .20], ["proportion", .20], ["color", .20], ["details", .10]];
// With a personal style goal, the goal takes 10%: 5 points from occasion fit and 5 from color.
const DIMS_GOAL: [string, number][] = [["occasion_fit", .25], ["cohesion", .20], ["proportion", .20], ["color", .15], ["details", .10], ["goal", .10]];
const BADGES = ["Nailed the occasion", "Color play", "Great proportions", "Texture mix", "Statement piece", "Polished details", "Tonal dressing", "Pattern mixing", "On goal"];
const badgeNames = (goal: string) => BADGES.filter((n) => goal || n !== "On goal");
const ITEM_TYPES = ["top", "bottom", "dress", "jacket", "outerwear", "shoes", "bag", "belt", "hat", "scarf", "eyewear", "other"];

const guessPrompt = () => `This photo shows a person's outfit. Guess what occasion they are dressed for, based only on the clothing you can see.
Choose exactly one category from this list: ${CATS.join(", ")}.
If the photo doesn't clearly suggest one, still pick the closest and mark confidence "low".
Reply with only JSON: {"category":"<one category from the list, spelled exactly>","confidence":"high"|"medium"|"low"}`;

const analyzePrompt = (cat: string, detail: string, goal: string) => `You are the stylist inside WearAbout, an outfit-logging app. The photo shows the user's outfit. They are dressed for: ${cat}${detail ? ` (${detail})` : ""}.

Rules you must follow:
1. Never make things up. Name a brand or model only when a visible logo or an unmistakable design makes you confident; otherwise describe the item by color, material and garment type. If you can't tell something, leave it out. A wrong guess is worse than not knowing.
2. Be kind and helpful. Talk only about the clothes and styling, never the person's body, face, weight, age or looks. Frame everything as making a good look even better. Kind does not mean inflated: score honestly.
3. Help, don't sell. Recommend a purchase only if one kind of item would add high value to this outfit for this occasion. Otherwise set "buy" to null.

Score each dimension from 1 to 10 (one decimal allowed), with a note of at most 14 words:
- occasion_fit: right formality and practicality for ${cat}
- cohesion: the pieces read as one intentional look
- proportion: silhouette, lengths and volumes balance; garments fit well
- color: the palette works together and with the wearer
- details: accessories, shoes, grooming and polish
${goal ? `- goal: how well the outfit moves toward the user's own style goal, "${goal}"
` : ""}
"tweak": one change using things they likely already own (styling, tucking, cuffing, swapping a piece, layering, hair). It must improve the lowest-scoring dimension. "title" at most 8 words, "detail" at most 30 words, "dimension" is that dimension's key.
"buy": null, or {"item": the kind of item, described specifically without inventing a brand, "why": at most 25 words, "search": a 3-7 word Google search for it}.
"review": one or two warm, specific sentences on what works.
"badges": 0 to 3 badges from this exact list, only when clearly earned (many outfits earn none): ${badgeNames(goal).join(", ")}.${goal ? ` "On goal" means the outfit clearly delivers on "${goal}".` : ""}
"items": every wardrobe item you can see, excluding jewelry. Each {"label": specific, like "tan suede Chelsea boots", "type": one of ${ITEM_TYPES.join(", ")} (use "jacket" for jackets, blazers, shackets and cardigans worn open; "outerwear" for coats, parkas and puffers), "brand": a string only if you are confident, else null}.
If no outfit is visible, reply {"error":"<short reason>"} instead.

Reply with only JSON in this shape:
{"dims":{"occasion_fit":{"score":8,"note":"..."},"cohesion":{"score":7.5,"note":"..."},"proportion":{"score":7,"note":"..."},"color":{"score":8,"note":"..."},"details":{"score":6.5,"note":"..."}${goal ? ',"goal":{"score":7,"note":"..."}' : ""}},"review":"...","badges":[],"tweak":{"title":"...","detail":"...","dimension":"details"},"buy":null,"items":[{"label":"...","type":"top","brand":null}]}`;

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

// deno-lint-ignore no-explicit-any
function normalize(a: any, goal: string) {
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
  const buy = b && b.item ? { item: String(b.item).slice(0, 120), why: String(b.why ?? "").slice(0, 220), search: String(b.search ?? b.item).slice(0, 90) } : null;
  const items = Array.isArray(a.items) ? a.items.filter((i: any) => i && i.label).slice(0, 20).map((i: any) => ({
    label: String(i.label).slice(0, 80), type: ITEM_TYPES.includes(i.type) ? i.type : "other", brand: i.brand ? String(i.brand).slice(0, 40) : null,
  })) : [];
  const names = badgeNames(goal);
  const badges = Array.isArray(a.badges) ? [...new Set(a.badges.map(String).filter((n: string) => names.includes(n)))].slice(0, 3) : [];
  return { score: round1(total), dims, low, review: String(a.review ?? "").slice(0, 320), tweak, buy, items, badges, goal };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Use POST." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user) return json(401, { error: "Sign in again." });

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json(500, { error: "Claude isn't set up yet (missing ANTHROPIC_API_KEY)." });

  let body: { action?: string; image?: string; category?: string; detail?: string; goal?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Bad request." }); }
  if (!body.image || body.image.length > 8_000_000) return json(400, { error: "Missing or oversized photo." });

  const limit = Number(Deno.env.get("STYLE_DAILY_LIMIT") ?? 60);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from("ai_usage").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("kind", "style").gte("created_at", since);
  if ((count ?? 0) >= limit) return json(429, { error: "You've hit today's styling limit. Try again tomorrow." });
  await admin.from("ai_usage").insert({ user_id: user.id, kind: "style" });

  const model = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5-5";
  const fast = Deno.env.get("CLAUDE_FAST_MODEL") ?? "claude-haiku-5-5";
  try {
    if (body.action === "guess") {
      const out = parseJson(await askClaude(key, fast, body.image, guessPrompt(), 200));
      const category = CATS.find((c) => c.toLowerCase() === String(out?.category ?? "").toLowerCase()) ?? null;
      return json(200, { category, confidence: out?.confidence ?? "low" });
    }
    const cat = CATS.includes(String(body.category)) ? String(body.category) : "Casual/Hangout";
    const detail = String(body.detail ?? "").slice(0, 60);
    const goal = String(body.goal ?? "").replace(/["\n]/g, " ").trim().slice(0, 40);
    const text = await askClaude(key, model, body.image, analyzePrompt(cat, detail, goal), 2000);
    return json(200, normalize(parseJson(text), goal));
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 429 || status === 529) return json(503, { error: "Claude is busy. Try again in a minute." });
    const msg = String((e as Error).message ?? "");
    if (msg && !/request failed|no json/i.test(msg)) return json(422, { error: `Couldn't score this photo: ${msg}` });
    return json(502, { error: "The style review didn't come back. Try again." });
  }
});
