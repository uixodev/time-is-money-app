# Tick — earn Ticks by working hard and looking after yourself, spend them on useless things

Three layers:

| Layer | What it is | Rule |
|---|---|---|
| **Time** | 86,400 seconds a day | Equal for everyone. Expires at midnight. |
| **Health** | Six pillars: **Sleep · Food · Move · Hygiene · Home · Family** | Each is a 0–100 gauge that drains through the day and refills when you look after it. |
| **Ticks (Ŧ.)** | Your money | Hard deeds and care earn them, useless deeds spend them. Never expire. Can go negative. |

## Health

- Overall Health = 60% average of the pillars + 40% your weakest pillar, so you can't hide a neglected one.
- **Gate:** below **40%** you can't start a hard deed, and a running one stops. Refill a pillar first.
- Pillars drain at different speeds (Food fastest, Family slowest — see `PILLARS` in `app.js`).

## Deed types

| Type | Examples | Effect |
|---|---|---|
| **Hard** | Deep work (+3/min) | earns Ticks (needs Health ≥ 40%) |
| **Care** (timer) | Sleep, Workout, Cleaning, Family time | refills one pillar over time and earns a few Ticks |
| **Care** (check-in) | Meal, Wash up | one tap: refills a pillar and pays Ticks in proportion to what it actually refilled — a full pillar pays nothing |
| **Useless** | Scrolling (−1/min), Gaming (−2/min) | spends Ticks |
| **Just living** | anything custom | uses time only |

## Debt

Ticks can go below zero. While you are in debt, useless time costs **+50%** and the card turns dark.
Earned Ticks repay the debt first, because it is simply a negative balance.

## Coins

Ticks come in **Tick (1)**, **Ten (10)** and **Hundred (100)** coins — one round family with an open timer ring.
The currency sign is a struck T with a seconds pip (`brand/`).

## Screens

- **Wallet** – Ticks balance, Health pillars, what are you doing, coin purse, time left, where today went.
- **Deeds** – hard / care / useless / living deeds. Add, edit (✎) or delete; log time you already spent.
- **Ask** – "2h scrolling", "100 ticks", "how is my health?".
- **Goals** – guilt-free rewards with how much hard work they need. Edit (✎) or delete them. Reach the target, then tap **Buy it** to spend the Ticks — with confetti and a chime (switch sounds off in the Ŧ. menu); bought rewards are kept in a list.
- **History** – earned vs. spent, 7-day time chart, day by day.

Colours: light lime `#C9F26B`, forest ink `#16210F`, tonal greens. Dark mode included.

## Run

No build step. Open `index.html`, or:

```bash
python3 -m http.server 8000
```

Data is stored in `localStorage` (`tick.v1`). Older saves are migrated automatically.

## Roadmap

- **Phase 2:** sleep mode (going-to-bed target, rewards for a steady bedtime), golden hours (×2 on hard deeds in windows you choose).
- **Phase 3:** end-of-session notes ("what did you get done?"), coin / confetti reward moments, vibration on Android.
- Later: accounts and sync, gifting Ticks, shared goals, AI for Ask.
