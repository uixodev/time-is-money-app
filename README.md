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
- **Real daily targets.** Each pillar has a real-life target that resets at midnight: **Sleep 8h · Food 3 meals · Move 30 min · Hygiene 2 washes · Home 30 min · Family 30 min · Allah 5 prayers**. The *Today's health* card at the top of the Deeds tab shows progress (e.g. `5h 20m of 8h`) for each. Timed deeds count minutes; check-ins count one each (Allah counts the prayer check-ins).
- **Daily earning limits.** Each pillar can pay only so many Tons a day (Sleep 90 · Food 60 · Move 50 · Hygiene 40 · Home 50 · Family 40 · Allah 80 ≈ 410), shown as *Tons earned of the limit*. When a pillar hits its limit it stops paying until tomorrow, on top of the existing "pillar is full" cap. The *to earn today* number on each deed is whichever limit comes first.
- **Gate (investing rules).** To start an investment you must first reach these exact minimums today: **Sleep 7h · Food 1 meal · Move 5 min · Hygiene 1 wash · Home (cleaning) 10 min**. Change them from *Investing rules* on the Deeds tab or the Rules button on the Invest tab — type a number for each pillar, or leave it empty to switch that rule off. A tick on each progress bar marks the minimum, and the Invest tab says what to finish first. A running investment is never stopped by the gate.
- **Exact amounts.** *Log an exact amount* (Deeds tab) lets you add what you really did — minutes for timed deeds, or how many times for check-ins (e.g. 2 meals) — and applies the same daily limits.

## Two currencies: Tons and gems

- **Tons** are your everyday money: earned by looking after yourself, spent on investing and useless time. They can be fractions and can go negative.
- **Gems** are the investment currency: **whole numbers only**, counted one by one. **Investments pay gems** (1 Ton of dividend = 5 gems; a gem arrives when a whole one has built up). They build up until you press **Collect** (or turn on **Auto-pay**).
- **The Shop is paid in gems**, not Tons. Old goals were converted once (÷5, minimum 1 gem) — edit them any time. Rewards you bought before stay recorded in Tons.
- **You can also buy gems with Tons** in the Shop, but it's deliberately pricey: **1 gem = 30 Tons** (packs of 1, 5 and 10). It only works while you have enough Tons — you can't buy gems into debt. Investing earns gems far cheaper.
- Dividends you had already collected in Tons stay in your Tons balance; ones that were still waiting became gems.

## Investments

Things like *Learn to code* or *Deep work* **cost Tons now** (0.25/min by default — halved in v28) and **pay daily dividends later**.

- **Skill** = hours invested, each hour fading **2% a day** without practice.
- **Dividend** per day = skill × cost rate × 2 — so 1 hour at 0.25/min (15 Tons) pays about 0.5 Tons a day.
- Break-even takes roughly 30–45 days; keep practising and the dividends keep coming.
- **You decide when dividends are paid.** They build up all day as "ready to collect"; press **Collect** (Wallet or Invest tab) to move them into your balance. Turn **Auto-pay** on and they go straight in instead. Collecting only moves forward, so two devices can never pay the same dividend twice.
- The **Invest** tab is your portfolio: dividend/day, invested vs. paid back, return %, break-even estimate, plus a **What if…?** box ("2h learn to code").

## Useless deeds

Scrolling, gaming… (found under **Spend** on the Wallet, no longer listed in the Deeds tab) they just cost Tons (1–5/min) and return nothing. Investments are deliberately cheaper than useless time.

## Where did my Tons go?

Your balance is a **running total** — welcome Tons + everything earned − everything spent — and it carries over between days. The Wallet card therefore shows three lines that always add up: **Started today with X** (or **in debt: −X**), **+earned · −spent today**, and the balance. Tap **Where did my Tons go?** for a day-by-day ledger (balance at the end of each day), your biggest costs and earnings, and — when you're below the welcome amount — **Start fresh at 30 Tons**, which resets the balance without touching your history or notes (it's stored as a "Fresh start" entry that counts toward the balance only, never toward earned/spent).

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
- **Shop** – spend your gems. Items are grouped by what they're for (Food, Fun, Rest, Self-care, Learning, Other); tap **Buy**, or **Treat myself** to spend on anything without making an item first. Items you're *saving up for* sit at the top with a progress bar and disappear once bought; ordinary shop items stay so you can buy them again. Edit (✎) any item to change its price, category or whether you're saving for it. Add a **cover picture** (a screenshot or photo from your device) when you create or edit an item — it's shrunk in the browser to a small JPEG, shows on the item's card, and syncs and backs up with everything else. Buying plays confetti and a chime (switch sounds off in the sign button).
- **History** – switch between 7 and 30 days: net Tons, care streak, best day, averages, an earned-vs-spent chart, *where your Tons went* (care, dividends, investing, useless time, rewards), *where your time went*, your Journal and day by day.

Dark / light: tap the **moon/sun** button in any screen's header to switch, or choose **Auto / Light / Dark** in the sign button menu (Auto follows your phone). The choice is remembered per device.

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

## Install on your phone

Open the live site, then: **iPhone** (Safari) → Share → *Add to Home Screen*. **Android** (Chrome) → ⋮ menu → *Install app* (or *Add to Home screen*). It opens full-screen like an app and works offline (a service worker keeps a copy; it checks for updates whenever you're online).

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
