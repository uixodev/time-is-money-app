# Worth — time is money

A mobile-first app that treats your time as money. Set an hourly rate, then:

- **Earn** – start a timer and watch dollars tick up live; track today / week / month against a daily hours target.
- **Plan** – hours earned vs. hours spent, a 7-day chart, and a daily target stepper.
- **Ask** – type a price ("$120 sneakers") and get its cost in hours of work, or ask what you earned/spent.
- **Save** – savings goals shown in dollars *and* hours of work remaining.
- **Cash out** – log purchases; each one shows its time cost, plus a "Time IQ" card for your biggest buy.

Design: Cleo-inspired layout (pill tabs, big numerals with small decimals, circled-icon tab bar) with a light lime
(`#C9F26B`) brand colour, deep forest ink (`#16210F`) as the dark anchor, and peach / mint / sky accent cards.
Supports dark mode.

## Run

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Data is stored locally in `localStorage` (key `worth.v1`).
