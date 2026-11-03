# Tons — your Health is your income

Three layers:

| Layer | What it is | Rule |
|---|---|---|
| **Time** | 86,400 seconds a day | Equal for everyone. Expires at midnight. |
| **Health** | Seven pillars: **Sleep · Food · Move · Hygiene · Home · Family · Allah** | Gauges that drain through the day. Refilling them **earns Tons**. |
| **Tons (Tons)** | Your money | Earned by looking after yourself, spent on investments and useless things. Never expire. Can go negative. |

## Income: Health

You earn Tons by refilling what has drained: **Tons = health points refilled × the pillar's price** (`PILLARS` in `app.js`).
A pillar that is already full pays nothing, so nothing can be farmed. Looking after every pillar for a full day earns roughly 400 Tons (health pays 50% more since v28).

- **Care deeds are labelled in Tons, not percentages.** A **timer** deed pays a rate in **Tons per second** while it runs (Workout `+0.03 Tons/sec`, Sleep `+0.003`, Quran `+0.015`…); a **check-in** pays a lump sum (Meal `+18.4 Tons each`, Prayer `+13.5 Tons each`). Behind the scenes each pillar still drains and refills (0–100%), which is why a full pillar stops paying and why very low Health blocks investing — but you only ever see and set Tons.
- **How much a pillar can still pay (“left”).** Every care deed shows how many Tons are **left** to earn from its pillar — e.g. `+0.003 Tons/sec · 34.2 left`. A deed pays its rate only until that number reaches zero (the pillar is full), then it stops until the pillar drains again. So 7 hours of sleep from a half-empty Sleep pillar pays the 34.2 that was left, not 7 × 3,600 × 0.003. The running timer counts the “left to earn” down live, and the summary shows what's left afterwards.
- **Allah (faith)** is the seventh pillar: **Prayer** (one tap, `+13.5 Tons`) and **Quran** (a timer, `+0.015 Tons/sec`). It drains slowly, counts toward overall Health like the others, and you can add your own deeds to it (dhikr, dua, charity…) from Deeds → +.
- Overall Health = 60% average of the pillars + 40% your weakest pillar.
- **Gate:** below **40%** you can't start an investment (and a running one stops). Look after yourself first.

## Investments

Things like *Learn to code* or *Deep work* **cost Tons now** (0.25/min by default — halved in v28) and **pay daily dividends later**.

- **Skill** = hours invested, each hour fading **2% a day** without practice.
- **Dividend** per day = skill × cost rate × 2 — so 1 hour at 0.25/min (15 Tons) pays about 0.5 Tons a day.
- Break-even takes roughly 30–45 days; keep practising and the dividends keep coming.
- The **Invest** tab is your portfolio: dividend/day, invested vs. paid back, return %, break-even estimate, plus a **What if…?** box ("2h learn to code").

## Useless deeds

Scrolling, gaming… they just cost Tons (1–5/min) and return nothing. Investments are deliberately cheaper than useless time.

## Debt

Tons can go below zero. In debt, **useless** time costs **+50%**. Earned Tons repay the debt first.

## Deed types

| Type | Examples | Tons |
|---|---|---|
| **Care** (timer) | Sleep, Workout, Cleaning, Family time, Quran | earns **Tons per second** while the pillar has room |
| **Care** (check-in) | Meal, Wash up, Prayer | one tap; pays Tons each, in proportion to what it refilled |
| **Investment** | Deep work, Learn to code | costs now, pays dividends |
| **Useless** | Scrolling, Gaming | costs |
| **Just living** | anything custom | time only |

## The live timer — and combining deeds

While a deed runs you see the **Big number** timer: huge time digits that roll as they change, a soft glow, a thin line that fills every minute, and your **live session Tons** underneath (`+ Tons 8.11`) — plus a note when a care deed's pillar is full and has stopped paying.

**You can run up to 3 deeds at once** — a care deed, an investment and a useless one in any mix (cleaning while you learn, say). Each earns or costs Tons at its own rate, and each is banked separately when it stops.

- With one running you get the big timer; with two or three you get one **combined card** (big clock + the **net** Tons, plus a row per deed with its own clock, live Tons and a **Stop** button, and **Stop all**).
- A deed that is already running isn't offered again, and at 3 you're asked to stop one first.
- Each deed's time counts in full for that deed, but the Wallet's *tracked today* never exceeds the real time so far — doing things together doesn't make the day longer.
- Stopping several at once queues their summary pop-ups one after another. Low Health stops running investments (not care deeds).
- Sessions sync between devices; a stop on one device doesn't bring the session back on another. Older saves with one running session upgrade automatically.

## Notes & Journal

- **Stop a care timer** (sleep, workout, cleaning, family time…) → a **Nicely done** pop-up shows time, Tons earned, **Tons per second** and your overall Health in words, then asks *"How did it go?"* with an optional 1–5 *how do you feel* rating.
- **Quick check-ins** (meal, wash up) → the confirmation toast has a **+ note** button.
- **Write a note any time** from the Journal (History tab): pick a deed or *General*.
- **Stop an investment** (10 seconds or longer) → a **Session done** pop-up shows time invested, Tons spent, skill added and how much your daily dividend grew, then asks *"What did you get from this?"* with an optional 1–5 focus rating.
- **Buy a goal** → an **Enjoy it** pop-up shows what it cost, what you have left and how long it took, then asks *"How was it? Was it worth it?"*.
- Notes are kept in the **Journal** (History tab). Tap one to edit or delete it. The latest note also shows on its investment card, and reward notes show under *Rewards you've bought*. Add a note any time with **+ note**.

## Coins & sign

The currency is **Tons**. Its sign is a **slanted-strike T**: a T struck by a slanted bar through the stem, with the little seconds pip (`brand/`). Tons come in three coins — **Ton (1)**, **Ten-ton (10)** and **Hundred-ton (100)** — the same round coin with an open timer ring; the darker, the more it is worth.

## Screens

- **Wallet** – Tons balance, coin purse, a live countdown to midnight (ticks every second), what are you doing, where today went. (Health still runs underneath; ask "how is my health?" in the Invest tab to see the pillars.)
- **Deeds** – care / investment / useless / living deeds. Add, edit (✎) or delete; log time you already spent.
- **Invest** – your portfolio and the What-if calculator.
- **Goals** – rewards to save Tons for. Edit (✎), then **Buy it** — with confetti and a chime (switch sounds off in the sign button).
- **History** – switch between 7 and 30 days: net Tons, care streak, best day, averages, an earned-vs-spent chart, *where your Tons went* (care, dividends, investing, useless time, rewards), *where your time went*, your Journal and day by day.

Colours: light lime `#C9F26B`, forest ink `#16210F`, tonal greens. Dark mode included.

## Accounts & cloud sync (Supabase)

Tons works fully offline without an account. Sign in (the person icon, top right) to back your data up and use it on any device — email + password (any email, including Gmail) or **Continue with Google**.

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

## Backup & restore

Open it from the **History** tab (Backup card), the **sign button**, or the **account** screen.

- **Export backup** downloads `tons-backup-YYYY-MM-DD.json` — your deeds, history, notes, goals and rewards.
- **Import a backup file** shows what's inside (entries, notes, deeds, goals) and lets you choose:
  - **Merge** — adds everything from the file to what's on this device and keeps both; nothing is lost, nothing is duplicated.
  - **Replace** — swaps this device's data for the file (only offered when signed out, because with an account the cloud would just merge your old data back).
- Older (v14) backup files still import.
- Backup files are treated as **untrusted input**: only known fields with valid types are accepted, ids must be plain tokens, colours must come from the palette and text is length-limited, so a doctored file can't inject code or break the app.

## Run

No build step. Open `index.html`, or:

```bash
python3 -m http.server 8000
```

Data is stored in `localStorage` (`tick.v1`). Older saves migrate automatically (the old "hard" deeds become investments).

## Roadmap

- Sleep mode (bedtime target, reward for a steady bedtime) and golden hours (bonus windows).
- End-of-session notes ("what did you get done?") and more reward moments (coin roll-over).
- Later: accounts and sync, gifting Tons, shared goals, AI for the What-if box.
