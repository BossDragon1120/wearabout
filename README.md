# WearAbout

Snap your outfit, say where you're going, and get it back on a clean studio or themed backdrop with a style score, one tweak and (only when it's worth it) one buy rec. Keep a daily streak and share fits with mutual friends.

- **App:** plain HTML/JS, hosted free on GitHub Pages, installable to your home screen.
- **Supabase:** sign-in (emailed code), database, private photo storage, and two server functions.
- **Photoroom:** cuts you out of the photo and builds the backdrop.
- **Claude (Anthropic API):** guesses the occasion, scores the fit, writes the recs and lists the items.

Your Photoroom and Anthropic keys live only in Supabase's server functions, never in the app.

## One-time setup (about 30 minutes)

### 1. Supabase project
1. Sign up at [supabase.com](https://supabase.com) and create a new project (any region near you). Save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. You should see "Success. No rows returned."
3. **Authentication → Sign In / Providers → Email**: make sure Email is enabled. Turn **Confirm email** on.
4. **Authentication → Emails → Magic Link** template: replace the body with the code version below so people get a 6-digit code (codes work inside the home-screen app; links would open Safari instead).
   ```html
   <h2>Your WearAbout code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   ```
   Do the same for the **Confirm signup** template.
5. **Authentication → URL Configuration**: set Site URL to your app's address, e.g. `https://bossdragon1120.github.io/wearabout/`.
6. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**. Put them in [`config.js`](config.js) (or send them to Claude to commit).

> Supabase's built-in email sender is rate-limited (a few emails an hour) and meant for testing. Before inviting friends, add your own email sender under **Authentication → Emails → SMTP Settings** (Resend has a free tier).

### 2. Photoroom
1. Create an account at [photoroom.com/api](https://www.photoroom.com/api) and copy your API key.
2. Start with the **sandbox** key: 1,000 free calls a month with a watermark, good for testing.
3. For real use, the **Plus** plan covers AI backgrounds, shadows and relighting at about $0.10 per image. Each logged fit makes two (studio + themed), so about $0.20 per fit.

### 3. Anthropic (Claude)
1. Create an account at [console.anthropic.com](https://console.anthropic.com), add a payment method, and create an API key.
2. Each fit costs roughly 1 to 3 cents.

### 4. Server functions
In Supabase, open **Edge Functions → Deploy a new function → Via Editor**:
1. Name it `backdrop`, paste [`supabase/functions/backdrop/index.ts`](supabase/functions/backdrop/index.ts), deploy.
2. Name it `style-fit`, paste [`supabase/functions/style-fit/index.ts`](supabase/functions/style-fit/index.ts), deploy.
3. **Edge Functions → Secrets**, add:
   | Name | Value |
   | --- | --- |
   | `PHOTOROOM_API_KEY` | your Photoroom key |
   | `ANTHROPIC_API_KEY` | your Anthropic key |

   Optional: `BACKDROP_DAILY_LIMIT` (default 40 images per person per day), `STYLE_DAILY_LIMIT` (default 60), `CLAUDE_MODEL` (default `claude-sonnet-5-5`), `CLAUDE_FAST_MODEL` (default `claude-haiku-5-5`), `PHOTOROOM_BG_MODEL` (e.g. `background-studio-beta-2025-03-17` to try Photoroom's studio background model).

If you prefer the command line: `supabase functions deploy backdrop` and `supabase functions deploy style-fit` from this folder, then `supabase secrets set PHOTOROOM_API_KEY=... ANTHROPIC_API_KEY=...`.

### 5. GitHub Pages
In this repo: **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`, folder `/ (root)`. Your app appears at `https://bossdragon1120.github.io/wearabout/` within a minute or two.

### 6. Put it on your phone
Open the app's address in **Safari**, sign in with the emailed code, then **Share → Add to Home Screen**. Open it from the icon; you may need to sign in once more there.

## Inviting friends
Send them the app link. They sign up with their email, then you each add the other's friend code on the **Friends** tab. Posts show only to mutual friends; scores always stay private.

## Where things live
| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The app |
| `config.js` | Supabase address and public key |
| `manifest.webmanifest`, `sw.js`, `icons/` | Home-screen install and offline shell |
| `supabase/schema.sql` | Tables, privacy rules and photo storage |
| `supabase/functions/backdrop` | Photoroom cut-out and backdrops |
| `supabase/functions/style-fit` | Claude occasion guess, score, recs and items |

## Product principles (built into the prompts)
1. **Never make things up.** Brands only when visible and certain; otherwise a plain description.
2. **Be kind and helpful.** Feedback is about the outfit, never the body.
3. **Help, don't sell.** A buy rec only when it adds real value; otherwise "No need to buy anything for this look!"
