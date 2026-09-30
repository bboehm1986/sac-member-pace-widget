# AE Member Enrollment — Pace Thermometer — SAC Custom Widget (PROTOTYPE)

A custom widget for SAP Analytics Cloud giving a quick visual answer to
"how far along is Member Annual Enrollment": a literal thermometer
(vertical glass tube + bulb, liquid fill) showing actual completion rate
against a dashed expected-pace line for this point in the cycle.

Requested 2026-09-30 by Blair/leadership as a "Thermometer/Barometer for
expectations" for both Member and Employer reporting. This is the Member
half — a separate, stylistically similar Employer widget is being built
in the Employer Election project as its own twin, not a shared component.

**Status: prototype.** Built and style-approved by Blair (2026-09-30)
against mock data; not yet bound to real Datasphere data or added to the
"AE Member Selection" story.

## No new Datasphere work

This widget reuses the exact same `aggregateData` binding
(`AM_MEMBER_ENROLLMENT_SUMMARY`) as `sac-member-enrollment-widget` and
`sac-member-operational-widget` — same consolidated model, same 8
dimensions / 22 measures in the same order (see those widgets' own
`main.js` header comments for the full list, or
`ae-member-enrollment-report/BUILD_PLAN_FOR_BLAIR.md`'s "SUPERSEDED —
consolidated into ONE aggregate cube" section for the underlying SQL).
This widget only reads the `StatusByWave` row-kind's `Enrollment_Status`
dimension and `MemberCount` measure.

## Files

- `widget.json` — manifest: properties (`width`, `height`, `asOfLabel`),
  a single `aggregateData` data binding, one exposed scripting method
  (`refresh`).
- `main.js` — defines the `<com-porticobenefits-memberpace>` custom
  element. Computes:
  - **Actual %** = Completed ÷ Total Set Up so far (not ÷ a fixed total-
    eligible-population figure — there's no reliable one yet,
    `TotalEligibleLives` is still a `NULL` placeholder pending BR-29).
  - **Expected %** = straight-line (linear) interpolation of today's
    position across the fixed Oct 19 – Dec 2, 2026 cycle window (same
    window as the Snap widget's Timeline) — a deliberate v1
    simplification, not a real S-curve accounting for the 4 waves'
    different windows/PSP steps.
  - **Status**: "On Pace" (green) if actual is within 5 points of
    expected or ahead, "Watch" (amber) within 15 points behind, "Behind
    Pace" (red) beyond that.

  Renders an inline SVG thermometer (rounded stem + bulb, clipped liquid
  fill, tick marks, dashed expected-pace marker, subtle glass highlight)
  — hand-rolled, no external chart library, same reasoning as the rest of
  the suite (SAC widget iframes are CSP-strict). Falls back to built-in
  mock data when no data binding is bound.
- `icon.svg` — icon shown in the SAC widget panel (copied from the Snap
  widget — same family, same icon).
- `preview.html` — standalone local test harness; drives the widget
  through the real `onCustomWidgetBeforeUpdate`/`onCustomWidgetAfterUpdate`
  lifecycle hooks, same pattern as the rest of this suite.

## Open questions, flagged for discussion, not yet resolved

- Should "Actual %" be measured against Total Set Up so far, or against a
  real total-eligible-member figure once one exists? The current
  definition reads as "completion rate among those who've started," which
  may or may not be what "how far along" should mean.
- Is a linear expected-pace line good enough, or does this need a real
  S-curve accounting for the 4 waves' different windows and PSP steps?
- What should the widget show before the real cycle window starts (right
  now, Expected correctly shows 0% since today's date is before Oct 19)?

## Next steps

1. Get Blair's sign-off on style and the open questions above.
2. Host on GitHub Pages, register in SAC, bind to `AM_MEMBER_ENROLLMENT_
   SUMMARY` (Measures then Dimensions, same order as the other two
   widgets in this suite) and add to the "AE Member Selection" story.
3. Compute the real integrity hash and set it in `widget.json` before
   registering — don't leave it empty (see the rest of this suite's own
   hard-learned lesson on this).
