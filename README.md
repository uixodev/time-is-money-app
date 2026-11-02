# Tick — a daily time currency

Time is the money. **1 Tick = 1 second.** Every midnight, every user receives the same **86,400 Ticks**
(one per second of the day). You spend them on your *deeds*. Unspent Ticks expire at midnight — nobody can
hoard time, and nobody gets more of it than anyone else.

## The coins

| Coin | Shape | Colour | Value |
|---|---|---|---|
| Tick | round, timer ring | lime | 1 second |
| Minute | round, timer ring | pale lime | 60 Ticks |
| Hour | round, timer ring | forest green | 3,600 Ticks |
| Day | round, timer ring | ink | 86,400 Ticks |

Every coin is round with an open timer ring and shows its value (1s, 1m, 1h, 1d); the darker the coin, the more it is worth. The Tick coin (`icon.svg`) is also the app icon.

## Screens

- **Wallet** – Ticks left today (counts down live while you spend), your coin purse (hours / minutes / ticks), start a deed, and where today went.
- **Deeds** – the things you spend time on. Add your own, or log time you already spent.
- **Ask** – "2h Netflix" → what it costs in Ticks, % of the day, and what you'd have left.
- **Goals** – "50 hours on Deep work", tracked in Ticks.
- **History** – 7-day stacked chart, average spent vs. expired.

Colours: light lime `#C9F26B`, forest ink `#16210F`, tonal greens for every accent. Dark mode included.

## Run

No build step. Open `index.html`, or:

```bash
python3 -m http.server 8000
```

Data is stored in `localStorage` (`tick.v1`).

## Ideas for later

Accounts and cross-device sync, gifting Ticks to friends, shared goals, a real AI for the Ask tab.
