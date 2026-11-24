# Parked material (2026-11-16)

Lesson 3 was taught up to slide 23 (x-chk1, the end of part 1). Everything after it is kept here, unbuilt, for lessons 5 and 6.
Lesson 4 is an exercise session on lessons 1 to 3 (content_l4.py, draft).

| File | Old part of lesson 3 | Planned for |
|---|---|---|
| content_c2.py | Trading venues: exchange, clearing house, OTC, interest rate swap (s-exch, s-clear, s-otc, s-swap, s-swap2, x-swap3, x-chk2, a-venue, news 2, stop 2) | venues: copied into content_v5.py (lesson 5, part 4, 2026-11-24). Swap slides and the swap news stay parked here for the swaps lesson (10) |
| content_c0.py | Futures in practice: margin, daily settlement, futures price, arbitrage (s-margin0, s-margin1, x-margin, s-mscreen, s-carry, x-carry, news 3, stop 3, s-compare) | lesson 5 |
| content_c1.py | Players: hedge with beta, speculator, leverage in futures and options (s-hedger0, x-ncon, s-spec, x-lev, x-specopt, a-who, x-chk3, news 4, stop 4) | lesson 6 |
| content_c3.py | Case study: jet fuel hedge in five sheets (s-f-why, x-f2, x-f3, x-f5, x-f6, x-f4, news 5, stop 5) | lesson 6 |
| content_d.py | Closing exercises (t-4, t-5, x-t6), old summary s-sum, old homework (h-1, h-2, hx-3 to hx-6), s-home, s-src. content_l3end.py reuses hx-3 and two MC items from it | lessons 5 and 6 |
| build_xlsx.py, list PARKED | Workbook sheets: leverage, fuel hedge, hedge ratio | lessons 5 and 6 |

The _STOPS and ROUTE texts for old parts 2 to 5 are still in content_l3.py (_STOPS) for reuse.
To rebuild a parked part: add a lesson entry in content_a.py (LMETA, TOTAL_PARTS, file list) and in build_deck.py (CSS_OF: c, d, i hold their styles).
- content_l4_old.py: the first lesson 4 (exercise session on lessons 1 to 3, 19 sheets in levels 1 to 4). Replaced on 2026-11-23 by the exam-level review. Not loaded by any lesson.
- Lesson 5 (draft, 2026-11-24): content_l5.py (parts 1 to 3 and s-sum4), content_v5.py (part 4, trading venues, at the end), content_l5h.py (end slide and self practice). CSS: css/r.css.
