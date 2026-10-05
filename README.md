# AE Member Enrollment — Pace Thermometer — SAC Custom Widget

A custom widget for SAP Analytics Cloud giving a quick visual answer to
"how far along is Member Annual Enrollment": a literal thermometer
(vertical glass tube + bulb, liquid fill) showing the actual completion
rate against a dashed expected-pace line for this point in the cycle.

Requested 2026-09-30 by Blair/leadership as a "Thermometer/Barometer for
expectations" for both Member and Employer reporting. This is the Member
half — a separate, stylistically similar Employer widget is built in the
Employer Election project as its own twin, not a shared component.


## FLEX members are excluded (v1.1.0, 2026-10-05)

`GLD_AE_Member_Enrollment` is shared with the FLEX dashboard (`sac-flex-member-widget`). FLEX members carry Wave "Group A"–"Group F", and this widget drops any row whose Wave starts with `Group `, next to its Portico exclusion. Blank-Wave rows are kept, so Traditional numbers don't change. In a headless check, output was byte-identical with and without FLEX rows injected. Gold's `Employer` column is also no longer NULL: it now holds "Name (Number)". Details: `../flex-member-enrollment-report/GOLD_CHANGES.md`.

## No new Datasphere work

Reuses the exact same `aggregateData` binding (`AM_MEMBER_ENROLLMENT_SUMMARY`)
as `sac-member-enrollment-widget` and `sac-member-operational-widget` —
same consolidated model, **22 measures then 9 dimensions** in the same
order (see `ae-member-enrollment-report/BUILD_PLAN_FOR_BLAIR.md`,
"Current DEPLOYED SQL for `DS_MEMBER_ENROLLMENT_SUMMARY`"). SAC binds by
position: add Measures first, then Dimensions, in exactly that order.
This widget reads only the `StatusByWave` row-kind: `Wave` (`dimensions_2`),
`Enrollment_Status` (`dimensions_3`), `Is_Portico_Employee` (`dimensions_8`,
`'Yes'` rows are excluded) and the `MemberCount` measure.

## How the numbers are defined (decided with Blair, 2026-10-05)

- **Actual %** = Completed ÷ Total Set Up. A set-up row is created for every
  member automatically when their wave opens, so Total Set Up is already the
  population of the waves that have opened so far. `TotalEligibleLives` is
  still a `NULL` placeholder pending BR-29, so there is no better
  denominator yet.
- **Expected %** = a per-wave straight-line expectation across each wave's
  OWN window (`WAVE_WINDOWS` in `main.js`: W1 10/19–11/2, W2a 11/9–11/17,
  W2b 11/9–11/30, W3 11/24–12/2), combined weighted by each wave's Total
  Set Up. A single line across the whole cycle read "Behind" every time a
  new wave opened (the denominator jumps while the line keeps climbing).
  Members with no Wave tag have no window of their own and use the whole
  cycle window (Oct 19 – Dec 2).
- **Status:** "Ahead of Pace" if actual ≥ expected + 5 points, "On Pace"
  within 5 points, "Watch" up to 15 points behind, "Behind Pace" beyond.
- **Before the cycle opens** (today < Oct 19), or with nothing set up, no
  pace judgement is made: neutral "Not Open Yet" / "Nothing Set Up Yet"
  badge, grey fill, no expected line. The Completed / Total Set Up counts
  and any fill still show, so a live binding can be verified before go-live.
- Portico employees are excluded in the widget (and by the main story's
  `Is_Portico_Employee = No` filter).

Verified in `preview.html` with a faked clock: Oct 19 → expected 3%, Nov 2
→ 43%, Nov 10 → 51% (hand-checked), Dec 3 → 100%.

## Files

- `widget.json` — manifest: properties (`width`, `height`, `asOfLabel`), a
  single `aggregateData` binding, one exposed method (`refresh`).
- `main.js` — defines `<com-porticobenefits-memberpace>`: the SVG
  thermometer (hand-rolled, no chart library — SAC widget iframes are
  CSP-strict) and the pace calculation above. Falls back to built-in mock
  data when nothing is bound.
- `icon.svg`, `preview.html` — widget-panel icon and a standalone harness.

## Maintenance

- **Every cycle:** bump `CYCLE_START`/`CYCLE_END` and `WAVE_WINDOWS` in
  `main.js` (same annual-maintenance pattern as the cube's `EventDate`
  literals; keep them in sync with the Snap widget's Timeline window).
- A `main.js` change breaks the live SAC registration until `widget.json`
  is re-uploaded (hash mismatch). Recompute the hash
  (`openssl dgst -sha384 -binary main.js | openssl base64 -A`), bump the
  version (minor/patch only once placed), and warn before pushing. GitHub
  Pages can sit "queued" — check the Actions runs and the hosted
  `widget.json` before re-uploading.
- No caveat / "open items" banners (Blair's standing decision, 2026-10-05).

## Status

- ✅ v1.0.0 built, verified in `preview.html`, hash set.
- ⏳ Not yet registered in SAC or added to a story.
- ⏳ Linear within each wave is still a simplification — real completion
  curves are front-loaded. Revisit if leadership gives actual target
  completion % by date.
