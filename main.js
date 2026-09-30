/*
    AE Member Enrollment — Pace Thermometer — SAC Custom Widget (PROTOTYPE)

    Quick visual answer to "how far along are we": a literal thermometer
    (vertical tube + bulb, liquid fill) comparing actual completion rate
    against a simple expected-pace line for this point in the cycle.
    Requested 2026-09-30 by Blair/leadership as a "Thermometer/Barometer
    for expectations" for both Member and Employer reporting -- this is
    the Member half. A separate, stylistically similar Employer widget is
    the other half; per Blair, envisioned as two separate widgets sharing
    the same visual language, not one shared component. Redesigned from an
    initial semicircle-gauge version after Blair asked for something more
    literally thermometer/barometer-shaped -- "stylish, not corny."

    PROTOTYPE STATUS: this is a first pass for Blair to react to and iterate
    on, not a finished build. Two simplifications flagged for that
    conversation:
      1. "Expected pace" is a straight-line (linear) interpolation across
         the fixed Oct 19 - Dec 2 cycle window -- not a real S-curve
         accounting for the 4 waves' different windows/PSP steps. The
         Employer suite's own "pacing badge" idea hit this same wall and
         was never built for Member Enrollment for exactly this reason.
         Good enough for a v1 gauge; worth revisiting once there's appetite
         for a more accurate curve.
      2. "Actual %" = Completed / Total Set Up SO FAR, not Completed /
         some fixed total-eligible-population figure -- there's no
         reliable "total eligible members" measure available yet
         (TotalEligibleLives is still a NULL placeholder pending BR-29).
         This reads as "completion rate among those who've started," which
         may or may not be what "how far along" should mean here -- flag
         this explicitly when reviewing with Blair.

    NO NEW DATASPHERE WORK -- reuses the exact same "aggregateData" binding
    (AM_MEMBER_ENROLLMENT_SUMMARY) as sac-member-enrollment-widget and
    sac-member-operational-widget, reading only the StatusByWave row-kind.
    See that widget's own main.js header for the full dimension/measure
    order this consolidated model exposes -- this widget only needs
    Enrollment_Status (dimensions_3) and MemberCount (measures_0).

    No in-widget filter controls, no theme toggle, light theme only --
    same reasoning as every widget in this suite: SAC's Optimized-story
    View mode doesn't deliver internal click/change events to a custom
    widget's shadow DOM.
*/
(function () {
    "use strict";

    // Same fixed cycle window as sac-member-enrollment-widget's Timeline --
    // keep these in sync if that window ever changes. TODO: reconfirm each
    // cycle, same annual-maintenance pattern as the EventDate literals used
    // elsewhere in this build.
    const CYCLE_START = new Date(2026, 9, 19);  // Oct 19, 2026
    const CYCLE_END = new Date(2026, 11, 2);    // Dec 2, 2026
    const CYCLE_LENGTH_DAYS = Math.round((CYCLE_END - CYCLE_START) / 86400000) + 1;

    // ---- Mock data (mirrors the real SAC ResultSet row shape) ----
    function row(dims, measures) {
        const out = {};
        dims.forEach((d, i) => { out["dimensions_" + i] = { id: d, label: d }; });
        measures.forEach((m, i) => { out["measures_" + i] = { raw: m, formatted: m == null ? "" : String(m) }; });
        return out;
    }
    const NULL_20 = new Array(20).fill(null);
    function rowStatusByWave(wave, status, count) {
        return row(
            ["StatusByWave", null, wave, status, null, null, null, null],
            [count, null].concat(NULL_20)
        );
    }
    // Illustrative mock mirroring the same population as the rest of the
    // suite's mock data (1703 total set up, 1472 completed -- ~86%, well
    // ahead of a straight-line pace this early in a 45-day window).
    const MOCK_AGGREGATE_DATA = { data: [
        rowStatusByWave("Wave 1", "Success", 1472),
        rowStatusByWave("Wave 1", "Abandoned", 77),
        rowStatusByWave("Wave 1", "Not Started", 93),
        rowStatusByWave("Wave 1", "In Progress", 29),
        rowStatusByWave("Wave 1", "Needs Follow-up", 32),
    ] };

    // ---- Template ----
    const template = document.createElement("template");
    template.innerHTML = `
        <style>
            :host {
                display: block;
                box-sizing: border-box;
                font-family: "72", "Segoe UI", Arial, sans-serif;
                /* Same glassmorphism system as the rest of the suite,
                   copy-pasted deliberately -- each shadow root is isolated. */
                --mesh-1: rgba(106, 92, 240, 0.16);
                --mesh-2: rgba(47, 111, 224, 0.12);
                --mesh-3: rgba(20, 151, 111, 0.10);
                --surface: rgba(255, 255, 255, 0.58);
                --border: rgba(255, 255, 255, 0.65);
                --text: #171a23;
                --text-soft: #5b6072;
                --accent: #6a5cf0;
                --accent-bg: rgba(106, 92, 240, 0.14);
                --success: #14976f;
                --success-bg: rgba(20, 151, 111, 0.14);
                --warning: #a5700c;
                --warning-bg: rgba(165, 112, 12, 0.14);
                --danger: #c94b4b;
                --danger-bg: rgba(201, 75, 75, 0.14);
                --track: rgba(23,26,35,0.07);
                --glass-blur: blur(20px) saturate(180%);
                --shadow-card: 0 1px 1px rgba(23,26,35,0.03), 0 4px 12px -2px rgba(23,26,35,0.07), 0 14px 28px -10px rgba(23,26,35,0.10);
            }
            * { box-sizing: border-box; }
            .dashboard {
                width: 100%; height: 100%; overflow: auto;
                background:
                    radial-gradient(at 12% 8%, var(--mesh-1) 0%, transparent 45%),
                    radial-gradient(at 88% 14%, var(--mesh-2) 0%, transparent 45%),
                    radial-gradient(at 50% 100%, var(--mesh-3) 0%, transparent 50%),
                    #f4f5fa;
                color: var(--text); border-radius: 18px; padding: 18px;
            }
            .eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-soft); margin-bottom: 2px; }
            .title { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
            .asof { font-size: 10.5px; color: var(--text-soft); margin-bottom: 10px; }
            .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px; border: 1px solid; }
            .badge.onpace { color: var(--success); border-color: rgba(20,151,111,0.35); background: var(--success-bg); }
            .badge.watch { color: var(--warning); border-color: rgba(165,112,12,0.35); background: var(--warning-bg); }
            .badge.behind { color: var(--danger); border-color: rgba(201,75,75,0.35); background: var(--danger-bg); }
            .badge.mock { color: var(--accent); border-color: rgba(106,92,240,0.35); background: var(--accent-bg); }

            .body-row { display: flex; gap: 22px; align-items: center; margin-top: 4px; }
            .therm-wrap { flex: 0 0 auto; width: 110px; }
            .therm-svg { width: 100%; height: auto; display: block; }
            .readout { flex: 1 1 auto; min-width: 0; }
            .readout-actual { font-size: 38px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
            .readout-actual.onpace { color: var(--success); }
            .readout-actual.watch { color: var(--warning); }
            .readout-actual.behind { color: var(--danger); }
            .readout-label { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-soft); margin-bottom: 6px; }
            .readout-expected { font-size: 12px; color: var(--text-soft); margin: 8px 0 10px; }
            .stat-row { display: flex; gap: 18px; margin-top: 4px; }
            .stat { text-align: left; }
            .stat-value { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text); }
            .stat-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-soft); }

            .notice { margin-top: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 8px 12px; font-size: 10.5px; color: var(--text-soft); box-shadow: var(--shadow-card); }
        </style>
        <div class="dashboard">
            <div class="eyebrow">2026 Annual Enrollment — Member</div>
            <div class="title">Enrollment Pace</div>
            <div class="asof" id="asof"></div>
            <span class="badge mock" id="dataBadge">Mock Data — Preview</span>

            <div class="body-row">
                <div class="therm-wrap"><div id="thermSvg"></div></div>
                <div class="readout">
                    <div class="readout-label">Actual Completion</div>
                    <div class="readout-actual" id="actualPct"></div>
                    <div class="readout-expected" id="expectedSub"></div>
                    <div id="statusBadgeWrap"></div>
                    <div class="stat-row">
                        <div class="stat"><div class="stat-value" id="statCompleted"></div><div class="stat-label">Completed</div></div>
                        <div class="stat"><div class="stat-value" id="statSetUp"></div><div class="stat-label">Total Set Up</div></div>
                        <div class="stat"><div class="stat-value" id="statDay"></div><div class="stat-label">Day of Cycle</div></div>
                    </div>
                </div>
            </div>

            <div class="notice">Prototype — "Actual" = Completed ÷ Total Set Up so far; "Expected" marker assumes straight-line pacing across the full cycle window. Both open for discussion.</div>
        </div>
    `;

    class MemberPace extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._props = { width: 460, height: 370 };
            this._aggregateData = MOCK_AGGREGATE_DATA;
            this._usingMockData = true;
        }

        connectedCallback() { this._render(); }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = Object.assign({}, this._props, changedProperties);
        }
        onCustomWidgetAfterUpdate(changedProperties) {
            if ("width" in changedProperties) this.style.width = changedProperties.width + "px";
            if ("height" in changedProperties) this.style.height = changedProperties.height + "px";
            if ("aggregateData" in changedProperties) { this._aggregateData = changedProperties.aggregateData; this._usingMockData = false; }
            this._render();
        }
        onCustomWidgetDestroy() {}
        refresh() { this._render(); }

        _dim(r, i) { const d = r["dimensions_" + i]; return d ? d.label : ""; }
        _measure(r, i) { const m = r["measures_" + i]; return m && m.raw != null ? Number(m.raw) : 0; }

        _computePace() {
            const rows = ((this._aggregateData && this._aggregateData.data) || []).filter((r) => this._dim(r, 0) === "StatusByWave");
            let totalSetUp = 0, completed = 0;
            rows.forEach((r) => {
                const count = this._measure(r, 0);
                totalSetUp += count;
                if (this._dim(r, 3) === "Success") completed += count;
            });

            const today = new Date();
            const daysElapsed = Math.min(CYCLE_LENGTH_DAYS, Math.max(0, Math.round((today - CYCLE_START) / 86400000) + 1));
            const expectedPct = Math.min(100, Math.round((daysElapsed / CYCLE_LENGTH_DAYS) * 100));
            const actualPct = totalSetUp ? Math.round((completed / totalSetUp) * 100) : 0;
            const delta = actualPct - expectedPct;
            const status = delta >= -5 ? "onpace" : delta >= -15 ? "watch" : "behind";
            const statusLabel = status === "onpace" ? (delta >= 5 ? "Ahead of Pace" : "On Pace") : status === "watch" ? "Watch" : "Behind Pace";

            return { totalSetUp, completed, daysElapsed, expectedPct, actualPct, status, statusLabel };
        }

        // A literal thermometer: rounded stem + bulb, liquid fill rising
        // from the bulb, a thin glass highlight for a "stylish, not corny"
        // finish, tick marks down one side, and a dashed expected-pace
        // notch crossing the stem.
        _thermSvg(actualPct, expectedPct, status) {
            const w = 110, h = 280;
            const cx = 46;
            const stemHalfW = 13;
            const stemTop = 14;
            const stemBottom = 202;   // where the stem visually meets the bulb
            const bulbCy = 226;
            const bulbR = 26;
            const colorVar = status === "onpace" ? "var(--success)" : status === "watch" ? "var(--warning)" : "var(--danger)";

            const pctToY = (pct) => stemBottom - (Math.max(0, Math.min(100, pct)) / 100) * (stemBottom - stemTop);
            const fillTopY = pctToY(actualPct);
            const expectedY = pctToY(expectedPct);

            const ticks = [0, 25, 50, 75, 100].map((pct) => {
                const y = pctToY(pct);
                return `<line x1="${(cx + stemHalfW + 4).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + stemHalfW + 10).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--text-soft)" stroke-width="1.5"></line>
                        <text x="${(cx + stemHalfW + 14).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="8.5" fill="var(--text-soft)">${pct}</text>`;
            }).join("");

            return `<svg viewBox="0 0 ${w} ${h}" class="therm-svg" role="img" aria-label="Enrollment pace thermometer">
                <defs>
                    <clipPath id="stemClip">
                        <rect x="${cx - stemHalfW}" y="${stemTop}" width="${stemHalfW * 2}" height="${stemBottom - stemTop + 40}" rx="${stemHalfW}"></rect>
                    </clipPath>
                </defs>

                <!-- bulb (always "full", same color as current fill) -->
                <circle cx="${cx}" cy="${bulbCy}" r="${bulbR}" fill="${colorVar}"></circle>
                <circle cx="${cx}" cy="${bulbCy}" r="${bulbR}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"></circle>

                <!-- stem track (empty) -->
                <rect x="${cx - stemHalfW}" y="${stemTop}" width="${stemHalfW * 2}" height="${stemBottom - stemTop}" rx="${stemHalfW}" fill="var(--track)"></rect>

                <!-- stem fill (clipped to the rounded stem shape) -->
                <g clip-path="url(#stemClip)">
                    <rect x="${cx - stemHalfW}" y="${fillTopY.toFixed(1)}" width="${stemHalfW * 2}" height="${(stemBottom - fillTopY + 40).toFixed(1)}" fill="${colorVar}"></rect>
                </g>

                <!-- stem outline -->
                <rect x="${cx - stemHalfW}" y="${stemTop}" width="${stemHalfW * 2}" height="${stemBottom - stemTop}" rx="${stemHalfW}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"></rect>

                <!-- glass highlight -->
                <rect x="${(cx - stemHalfW + 3).toFixed(1)}" y="${stemTop + 4}" width="4" height="${stemBottom - stemTop - 8}" rx="2" fill="rgba(255,255,255,0.35)"></rect>

                <!-- expected-pace marker -->
                <line x1="${(cx - stemHalfW - 6).toFixed(1)}" y1="${expectedY.toFixed(1)}" x2="${(cx + stemHalfW + 6).toFixed(1)}" y2="${expectedY.toFixed(1)}" stroke="var(--text)" stroke-width="2" stroke-dasharray="3,2"></line>

                ${ticks}
            </svg>`;
        }

        _render() {
            const root = this._shadowRoot;
            const p = this._computePace();

            root.getElementById("asof").textContent = "As of: " + new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
            root.getElementById("dataBadge").textContent = this._usingMockData ? "Mock Data — Preview" : "Live";

            root.getElementById("thermSvg").innerHTML = this._thermSvg(p.actualPct, p.expectedPct, p.status);
            const actualEl = root.getElementById("actualPct");
            actualEl.textContent = p.actualPct + "%";
            actualEl.className = "readout-actual " + p.status;
            root.getElementById("expectedSub").textContent = "Expected " + p.expectedPct + "% by today (dashed line)";
            root.getElementById("statusBadgeWrap").innerHTML = `<span class="badge ${p.status}">${p.statusLabel}</span>`;

            root.getElementById("statCompleted").textContent = p.completed.toLocaleString();
            root.getElementById("statSetUp").textContent = p.totalSetUp.toLocaleString();
            root.getElementById("statDay").textContent = p.daysElapsed + " of " + CYCLE_LENGTH_DAYS;
        }
    }

    customElements.define("com-porticobenefits-memberpace", MemberPace);
})();
