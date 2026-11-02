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
- **History** – earned vs. spent, 7-day time chart, your **Journal** of notes, day by day.

Colours: light lime `#C9F26B`, forest ink `#16210F`, tonal greens. Dark mode included.

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
