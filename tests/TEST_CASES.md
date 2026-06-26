# ZoneSync — Test Cases

All test cases below were run against the actual conversion logic in `converter/index.html` and verified to pass. Use this as a manual QA checklist before each deploy, or whenever the conversion logic changes.

---

## 1. Converter — Core Conversion Accuracy

| # | From (zone, date, time) | To zone | Expected result | Notes |
|---|---|---|---|---|
| 1 | New York, Jun 26 2026, 8:59 AM | Mumbai/Delhi | **6:29 PM**, same day | EDT (UTC-4) → IST (UTC+5:30), 9h30m gap |
| 2 | Mumbai/Delhi, Jun 26 2026, 8:59 AM | New York | **11:29 PM**, *previous* day | Reverse of #1 — date rolls back |
| 3 | UTC, Jun 26 2026, 12:00 PM | Mumbai/Delhi | **5:30 PM**, same day | Clean UTC+5:30 check |
| 4 | Los Angeles, Jun 25 2026, 11:00 PM | Tokyo | **3:00 PM**, *next* day | Date rollover forward |
| 5 | Same zone on both sides (e.g. Mumbai → Mumbai) | — | Identical time, 0 diff | Sanity / no-op check |

**Why #1 and #2 matter most:** this is the exact pair you flagged as confusing. Confirms the tool answers "if it's X in the FROM zone, what is it in the TO zone" — not "what is it right now."

---

## 2. Daylight Saving Time (DST) Correctness

| # | Scenario | Expected result | Why it matters |
|---|---|---|---|
| 6 | New York 9:00 AM, **January 15** → Mumbai | **7:30 PM** (10h30m gap) | EST active (UTC-5) |
| 7 | New York 9:00 AM, **June 15** → Mumbai | **6:30 PM** (9h30m gap) | EDT active (UTC-4) — note this is **1 hour earlier** than test #6 despite the same input time, because the US/India gap shifts with DST |
| 8 | London 1:30 AM, **March 29, 2026** → UTC | **1:30 AM UTC** | Just *before* UK's spring-forward (GMT, offset 0) |
| 9 | London 3:30 AM, **March 29, 2026** → UTC | **2:30 AM UTC** | Just *after* spring-forward (BST, offset +1) — confirms the tool handles the exact transition hour correctly |

**Manual check to run periodically:** redo tests #6 and #7 around late March and late October each year, since that's when US and EU/UK DST transitions land on different calendar dates, temporarily widening or narrowing the gap.

---

## 3. Date Rollover Edge Cases

| # | Scenario | Expected result |
|---|---|---|
| 10 | Los Angeles, **Dec 31, 2025, 11:00 PM** → Tokyo | **Jan 1, 2026** (next day, next year) |
| 11 | Mumbai/Delhi, 8:59 AM → New York | Previous calendar day (see test #2) |

Confirms year boundaries and day-of-week labels roll over correctly, not just the hour/minute.

---

## 4. Non-Whole-Hour Offsets

| # | Scenario | Expected result | Why it matters |
|---|---|---|---|
| 12 | Mumbai/Delhi (UTC+5:30) → New York | Difference includes **:30** | India is one of several countries on a half-hour offset |
| 13 | Mumbai/Delhi (UTC+5:30) → Newfoundland, Canada (UTC-2:30 in summer) | Exactly **8h 0m** (no remainder) | Two half-hour offsets can cancel out — don't assume a half-hour zone always produces a half-hour remainder |

If you add more cities later, also test Adelaide/Darwin, Australia (UTC+9:30) and Kathmandu, Nepal (UTC+5:45) — the only major 45-minute offset zone in the world.

---

## 5. Swap Button

| # | Action | Expected result |
|---|---|---|
| 14 | Set From=New York, To=Mumbai, get a result, then click **Swap (⇄)** | From/To values swap, and the result recalculates immediately using the *same date/time value* you'd entered — it should NOT keep the old result frozen |

---

## 6. "Use Current Time" Button

| # | Action | Expected result |
|---|---|---|
| 15 | Click **Use current time** | Date and time fields populate with your device's actual current date/time (in your own local zone) — then the conversion runs using that as the FROM-zone input |

⚠️ **Known UX gotcha (this is what caused your question):** "Use current time" fills the date/time boxes with *your device's* current wall-clock time, then treats that as if it were the literal clock time in the FROM zone — not as "right now, converted." If your device is in IST and FROM is set to New York, clicking this button does **not** give you "the current time in New York" — it takes your IST clock reading and mislabels it as a New York time. This is a real ambiguity worth fixing (see suggestion below).

---

## 7. World Clock Grid (Homepage) & City Pages — Day/Night Badge

| # | Local hour in that city | Expected badge |
|---|---|---|
| 16 | 5:59 AM | 🌙 Night |
| 17 | 6:00 AM | ☀️ Day |
| 18 | 6:30 PM (18:30) | ☀️ Day |
| 19 | 7:00 PM (19:00) | 🌙 Night |

Day window is currently 06:00–18:59. Confirms the boundary doesn't misclassify early evening as "night" (this was an actual bug I caught and fixed during build — originally cut off at 6 PM, which mislabeled London at 6:25 PM as nighttime).

---

## 8. Live-Updating Behavior

| # | Check | Expected result |
|---|---|---|
| 20 | Leave homepage open for 60+ seconds | All city tiles' seconds digits tick forward; no freezing |
| 21 | Leave a city page (e.g. `/timezone/london/`) open across a real minute boundary | Minute value increments correctly, no stuck display |
| 22 | Leave city page open across local midnight (hard to test live — simulate by changing device clock) | Date label updates, day/night badge flips appropriately |

---

## 9. Schema / SEO Validation (technical, not visual)

| # | Check | How to verify |
|---|---|---|
| 23 | All JSON-LD blocks are valid JSON | Run each page's `<script type="application/ld+json">` content through a JSON validator |
| 24 | Each city page's FAQ schema matches the visible FAQ text on the page | Manually diff schema vs. rendered FAQ section |
| 25 | Canonical URL matches the actual page path | Check `<link rel="canonical">` on each page |

---

## Suggested fix arising from test #15

Right now "Use current time" can produce a misleading result if the FROM zone isn't the visitor's own zone. Two options:
- **A.** Relabel the button "Use current time in [FROM zone name]" and have it fetch the *actual* current time in that zone (not the visitor's device time) — more correct, slightly more code.
- **B.** Add a one-line caption under the date/time fields: "Enter the date and time as it would appear in the FROM zone" — cheaper, removes ambiguity without changing behavior.

Want me to implement one of these, or move on to building the remaining `/convert/` pair pages and additional cities?
