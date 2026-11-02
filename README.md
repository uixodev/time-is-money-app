# Tick — a daily time currency

Time is the money. **1 Tick = 1 second.** Every midnight, every user receives the same **86,400 Ticks**
(one per second of the day). You spend them on your *deeds*. Unspent Ticks expire at midnight — nobody can
hoard time, and nobody gets more of it than anyone else.

## The coins

| Coin | Shape | Colour | Value |
|---|---|---|---|
| Tick | circle | lime | 1 second |
| Minute | hexagon | mint | 60 Ticks |
| Hour | rounded square | sky | 3,600 Ticks |
| Day | double-ring circle | peach | 86,400 Ticks |

Every coin carries a clock hand and its value. The Tick coin (`icon.svg`) is also the app icon.

## Screens

- **Wallet** – Ticks left today (counts down live while you spend), your coin purse (hours / minutes / ticks), start a deed, and where today went.
- **Deeds** – the things you spend time on. Add your own, or log time you already spent.
- **Ask** – "2h Netflix" → what it costs in Ticks, % of the day, and what you'd have left.
- **Goals** – "50 hours on Deep work", tracked in Ticks.
- **History** – 7-day stacked chart, average spent vs. expired.

Colours: light lime `#C9F26B`, forest ink `#16210F`, peach / mint / sky accents. Dark mode included.

## Run

No build step. Open `index.html`, or:

```bash
python3 -m http.server 8000
```

Data is stored in `localStorage` (`tick.v1`).

## Ideas for later

Accounts and cross-device sync, gifting Ticks to friends, shared goals, a real AI for the Ask tab.
