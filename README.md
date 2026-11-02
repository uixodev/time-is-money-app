# Tick — your Health is your income

Three layers:

| Layer | What it is | Rule |
|---|---|---|
| **Time** | 86,400 seconds a day | Equal for everyone. Expires at midnight. |
| **Health** | Six pillars: **Sleep · Food · Move · Hygiene · Home · Family** | Gauges that drain through the day. Refilling them **earns Ticks**. |
| **Ticks (Ŧ.)** | Your money | Earned by looking after yourself, spent on investments and useless things. Never expire. Can go negative. |

## Income: Health

You earn Ticks by refilling what has drained: **Ticks = health points refilled × the pillar's price** (`PILLARS` in `app.js`).
A pillar that is already full pays nothing, so nothing can be farmed. A day of proper upkeep earns roughly 230 Ticks.

- Overall Health = 60% average of the pillars + 40% your weakest pillar.
- **Gate:** below **40%** you can't start an investment (and a running one stops). Look after yourself first.

## Investments

Things like *Learn to code* or *Deep work* **cost Ticks now** (e.g. 0.5/min) and **pay daily dividends later**.

- **Skill** = hours invested, each hour fading **2% a day** without practice.
- **Dividend** per day = skill × cost rate × 2 — so 1 hour at 0.5/min (30 Ticks) pays about 1 Tick a day.
- Break-even takes roughly 30–45 days; keep practising and the dividends keep coming.
- The **Invest** tab is your portfolio: dividend/day, invested vs. paid back, return %, break-even estimate, plus a **What if…?** box ("2h learn to code").

## Useless deeds

Scrolling, gaming… they just cost Ticks (1–5/min) and return nothing. Investments are deliberately cheaper than useless time.

## Debt

Ticks can go below zero. In debt, **useless** time costs **+50%**. Earned Ticks repay the debt first.

## Deed types

| Type | Examples | Ticks |
|---|---|---|
| **Care** (timer) | Sleep, Workout, Cleaning, Family time | earns, while a pillar has room |
| **Care** (check-in) | Meal, Wash up | one tap; earns in proportion to what it refilled |
| **Investment** | Deep work, Learn to code | costs now, pays dividends |
| **Useless** | Scrolling, Gaming | costs |
| **Just living** | anything custom | time only |

## Notes & Journal

- **Stop an investment** (10 seconds or longer) → a **Session done** pop-up shows time invested, Ticks spent, skill added and how much your daily dividend grew, then asks *"What did you get from this?"* with an optional 1–5 focus rating.
- **Buy a goal** → an **Enjoy it** pop-up shows what it cost, what you have left and how long it took, then asks *"How was it? Was it worth it?"*.
- Notes are kept in the **Journal** (History tab). Tap one to edit or delete it. The latest note also shows on its investment card, and reward notes show under *Rewards you've bought*. Add a note any time with **+ note**.

## Coins & sign

Ticks come in **Tick (1)**, **Ten (10)** and **Hundred (100)** coins. The currency sign is a struck T with a seconds pip (`brand/`).

## Screens

- **Wallet** – Ticks balance, coin purse, a live countdown to midnight (ticks every second), what are you doing, where today went. (Health still runs underneath; ask "how is my health?" in the Invest tab to see the pillars.)
- **Deeds** – care / investment / useless / living deeds. Add, edit (✎) or delete; log time you already spent.
- **Invest** – your portfolio and the What-if calculator.
- **Goals** – rewards to save Ticks for. Edit (✎), then **Buy it** — with confetti and a chime (switch sounds off in the Ŧ. menu).
- **History** – switch between 7 and 30 days: net Ticks, care streak, best day, averages, an earned-vs-spent chart, *where your Ticks went* (care, dividends, investing, useless time, rewards), *where your time went*, your Journal and day by day.

Colours: light lime `#C9F26B`, forest ink `#16210F`, tonal greens. Dark mode included.

## Accounts & cloud sync (Supabase)

Tick works fully offline without an account. Sign in (the person icon, top right) to back your data up and use it on any device — email + password (any email, including Gmail) or **Continue with Google**.

**How it syncs:** local-first. Every change is saved in the browser immediately, then mirrored to one row per user in the `tick_state` table about 2.5 seconds later, and re-checked every minute and whenever you come back to the tab. A revision number detects two devices writing at once; the states are **merged** (entries, notes and rewards are unioned, the newest edit of a deed or goal wins, deletes are remembered) so nothing is lost. Offline edits sync when you reconnect.

### Status for this repo

The Supabase project **time-is-money-app** is already created, the `tick_state` table and its Row Level Security policies are applied (see `supabase/schema.sql`), and `config.js` holds its URL and public anon key. The only thing left to do in the dashboard is step 4 below (Site URL + Redirect URLs); Google sign-in (step 6) is optional.

### Setup from scratch (about 5 minutes)

1. **Create a project** at <https://supabase.com> (free tier is fine).
2. **Create the table:** Dashboard → *SQL Editor* → *New query* → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → *Run*. It turns on Row Level Security so each user can only ever see their own row.
3. **Add your keys:** Dashboard → *Project Settings → API*. Copy the **Project URL** and the **anon / publishable** key into [`config.js`](config.js), commit and push. The anon key is designed to be public. **Never** put the `service_role` key anywhere in this repo.
4. **Tell Supabase where the app lives:** *Authentication → URL Configuration* → set **Site URL** to `https://uixodev.github.io/time-is-money-app/` and add the same address (plus `http://localhost:8000/` for local testing) under **Redirect URLs**. Without this, confirmation and reset links won't come back to the app.
5. **Email + password** is on by default. Under *Authentication → Sign In / Providers → Email* you can choose whether new users must **confirm their email** first (recommended for a public app).
6. **Optional — Google sign-in:** create an *OAuth client ID* (Web application) in Google Cloud Console, add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI, then paste the client ID and secret into *Authentication → Sign In / Providers → Google* and switch it on.

### Notes

- **Use the live site for sign-in:** <https://uixodev.github.io/time-is-money-app/>. A copy opened as a local file works offline, but its data is stored separately from the live site's (browsers keep them apart); sign in on both and the cloud merges them. Email, reset and Google links always return to `SITE_URL` in `config.js`.
- Forgot password: the sign-in screen sends a reset link; following it opens a "choose a new password" box.
- Signing out asks whether to keep or clear this device's copy. If a different account signs in on a device that holds someone else's data, the app asks before replacing it — it never uploads one account's data into another.
- `sound` is a per-device setting and is not synced.

## Backup

Your data lives in this browser. In the **Ŧ. menu** use **Export a backup** to download it as a JSON file and **Import a backup** to restore it (on another device, or after clearing site data).

## Run

No build step. Open `index.html`, or:

```bash
python3 -m http.server 8000
```

Data is stored in `localStorage` (`tick.v1`). Older saves migrate automatically (the old "hard" deeds become investments).

## Roadmap

- Sleep mode (bedtime target, reward for a steady bedtime) and golden hours (bonus windows).
- End-of-session notes ("what did you get done?") and more reward moments (coin roll-over).
- Later: accounts and sync, gifting Ticks, shared goals, AI for the What-if box.
