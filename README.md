# Tick — earn Ticks with hard things, spend them on useless things

Two separate currencies:

- **Time** — everyone gets the same **86,400 seconds** every day. It can't be saved; unspent time expires at midnight.
- **Ticks (Ŧ.)** — *your own* money. **Hard deeds earn Ticks. Useless deeds cost Ticks.** Ticks never expire, so you build a guilt-free balance for wasting time.

Every deed has a type and a rate in Ticks per minute:

| Type | Example | Effect |
|---|---|---|
| Hard | Deep work (+3/min), Workout (+4/min) | earns Ticks |
| Useless | Scrolling (−1/min), Gaming (−2/min) | spends Ticks — you can't start one without enough |
| Just living | Sleep | uses time only |

You start with 30 Ticks as a welcome gift. A useless deed stops automatically when your Ticks run out.

## The coins

Ticks come in three coins — **Tick (1)**, **Ten (10)**, **Hundred (100)** — one round family with an open timer ring;
the darker the coin, the more it is worth. The currency sign is a struck T with a seconds pip (`brand/`).

## Screens

- **Wallet** – Ticks balance (live), coin purse, start a deed, time left today, where today went.
- **Deeds** – hard / useless / just-living deeds with their rates. Add your own, or log time you already spent.
- **Ask** – "2h scrolling" → cost in Ticks and what you'd have left; "100 ticks" → how long to earn or burn them.
- **Goals** – guilt-free rewards ("Gaming weekend: 600 Ticks") with how much hard work they need.
- **History** – average earned vs. spent, 7-day time chart, day-by-day net Ticks.

Colours: light lime `#C9F26B`, forest ink `#16210F`, tonal greens. Dark mode included.

## Run

No build step. Open `index.html`, or:

```bash
python3 -m http.server 8000
```

Data is stored in `localStorage` (`tick.v1`).

## Ideas for later

Accounts and sync, gifting Ticks, Tick-earning streak bonuses, shared goals, a real AI for Ask.
