import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildReport, eventDates, formatHoursMinutes, formatMinutesSeconds } from "../Stats/v04/data.mjs";
import { createReportPDF } from "../Stats/v04/pdf.mjs";

const source = readFileSync(new URL("../Stats/v03/snapshot.json", import.meta.url));
const snapshot = JSON.parse(source);
const stats = ["starts", "oneVsOne", "twoVsTwo", "entries", "completed", "exits", "activeMinutes"];
const ledger = {
  "2026-10-15": [58, 49, 9, 134, 53, 5, 168.39382160820585],
  "2026-10-16": [37, 34, 3, 80, 30, 7, 103.49193737481122],
  "2026-10-17": [79, 66, 13, 184, 77, 2, 234.53595343667538],
  "2026-10-18": [54, 42, 12, 132, 51, 3, 156.5755892906755],
};
const dates = Object.keys(ledger);
const eventOnly = ["playerMinutes", "averageSecondsPerEntry", "levels", "enemiesKilled", "killsPerStart"];

test("source is Matt's original four-day EDT export", () => {
  assert.equal(createHash("sha256").update(source).digest("hex"),
    "2871bf192eae2e46895d8b306449fc14ac3ade3ca5b90ac2ab58bd0c724b5990");
  assert.equal(snapshot.window_start, "2026-10-15T00:00:00-04:00");
  assert.equal(snapshot.window_end_exclusive, "2026-10-19T00:00:00-04:00");
  assert.deepEqual(eventDates(snapshot), dates);
});

for (const [start, from] of dates.entries()) {
  for (const to of dates.slice(start)) {
    test(`dates ${from} through ${to} are inclusive, project only available metrics`, () => {
      const report = buildReport(snapshot, from, to);
      const selected = dates.slice(start, dates.indexOf(to) + 1);
      assert.deepEqual(report.days.map(day => day.date), selected);
      for (const day of report.days) {
        assert.deepEqual(stats.map(field => day[field]), ledger[day.date]);
      }
      for (const [index, field] of stats.entries()) {
        assert.equal(report[field], selected.reduce((total, date) => total + ledger[date][index], 0));
      }
      assert.equal(report.completionRate, 100 * report.completed / report.starts);
      assert.equal(report.fullEvent, selected.length === dates.length);
      if (!report.fullEvent) {
        for (const field of eventOnly) assert.equal(report[field], null, field);
      }
    });
  }
}

test("headline figures and level details reconcile to the full event", () => {
  const report = buildReport(snapshot);
  assert.equal(report.starts, snapshot.summary.starts);
  assert.equal(report.completed, snapshot.summary.status.Completed);
  assert.equal(report.exits, snapshot.incomplete.length);
  assert.equal(report.entries, snapshot.totals.player_slots);
  assert.ok(Math.abs(report.activeMinutes - snapshot.summary.active_minutes) < 1e-9);
  assert.equal(report.completionRate.toFixed(1), "92.5");
  assert.equal(formatHoursMinutes(report.activeMinutes), "11h 03m");
  assert.equal(formatHoursMinutes(report.playerMinutes), "25h 39m");
  assert.equal(formatMinutesSeconds(report.averageSecondsPerEntry), "2m 54s");
  assert.equal(report.enemiesKilled, 16782);
  assert.equal(report.killsPerStart.toFixed(1), "73.6");
  assert.equal(report.levels.length, 9);
  assert.equal(report.levels[0].name, "LATTICE");
  assert.equal(report.levels.find(level => level.name === "HIGGS").exits, 12);
  for (const level of report.levels) {
    assert.equal(level.starts, snapshot.levels[level.name].starts);
    assert.equal(level.exits, snapshot.incomplete.filter(row => row.level === level.name).length);
    assert.equal(level.shareOfStarts, 100 * level.starts / report.starts);
  }
});

test("time rounds once after summation and the Saturday report matches the meeting brief", () => {
  assert.equal(formatHoursMinutes(buildReport(snapshot, dates[0], dates[1]).activeMinutes), "4h 32m");
  const saturday = buildReport(snapshot, dates[2], dates[2]);
  assert.equal(formatHoursMinutes(saturday.activeMinutes), "3h 55m");
  assert.equal(saturday.completionRate.toFixed(1), "97.5");
});

test("unknown, timestamped and reversed date filters cannot return a misleading report", () => {
  for (const [from, to] of [
    ["2026-10-14", dates[1]], [dates[3], "2026-10-19"], [dates[2], dates[0]],
    [dates[0], "2026-10-18T00:00:00Z"], ["", dates[3]],
  ]) assert.throws(() => buildReport(snapshot, from, to), RangeError);
});

test("PDF export follows the selected dates, level and open sections", async () => {
  const full = buildReport(snapshot);
  const options = { sections: ["daily", "levels", "combat"], stage: "HIGGS" };
  const file = createReportPDF(full, options);
  assert.equal(file.type, "application/pdf");
  const pdf = await file.text();
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1]);
  assert.ok(pdf.startsWith("xref\n", xref));
  assert.match(pdf, /\/Count 1\b/);
  for (const value of ["530", "2m 54s", "211 of 228", "Matches by day", "HIGGS", "Combat", "16,782"]) {
    assert.ok(pdf.includes(value), value);
  }
  const saturday = await createReportPDF(buildReport(snapshot, dates[2], dates[2]), options).text();
  for (const value of ["17 OCTOBER 2026", "184", "3h 55m", "77 of 79"]) {
    assert.ok(saturday.includes(value), value);
  }
  for (const excluded of ["HIGGS", "Combat", "25h 39m", "2m 54s", "16,782"]) {
    assert.ok(!saturday.includes(excluded), excluded);
  }
  const summary = await createReportPDF(full, { sections: [] }).text();
  assert.ok(!summary.includes("Matches by day"));
  assert.ok(!summary.includes("Combat"));
});

test("cabinet scores use completed entries, exact meV, the report period and shared ranks", async () => {
  const daily = Object.fromEntries(dates.map((date, i) => [date, {
    teamMeV: String(12000 * (i + 1)), playerMeV: String(2000 * (i + 1)), entries: i + 2,
    top: [{meV: "1001", level: "HIGGS", mode: "1v1"}, {meV:"1000", level:"NOVA", mode:"2v2"}],
  }]));
  daily[dates[2]].top[0].meV = "9007199254740993";
  daily[dates[3]].top[0].meV = "9007199254740992";
  const report = buildReport(snapshot, dates[1], dates[2], daily);
  assert.equal(report.score.total, "60 eV");
  assert.equal(report.score.average, "1.429 eV");
  assert.equal(report.score.entries, 7);
  assert.deepEqual(report.score.top.map(row => [row.rank, row.date, row.value]), [
    [1, dates[2], "9.007199254740993 TeV"], [2, dates[1], "1.001 eV"], [3, dates[1], "1 eV"],
  ]);
  const all = buildReport(snapshot, undefined, undefined, daily);
  assert.deepEqual(all.score.top.map(row => row.value), ["9.007199254740993 TeV","9.007199254740992 TeV","1.001 eV"]);
  assert.deepEqual(buildReport(snapshot, dates[0], dates[1], daily).score.top.map(row => row.rank), [1,1,3]);
  assert.equal(buildReport(snapshot).score, null);
  assert.equal(buildReport(snapshot, dates[0], dates[1], {[dates[1]]: daily[dates[1]]}).score, null);
  assert.match(await createReportPDF(report,{sections:["scores"]}).text(), /Top 3 individual scores/);
  assert.doesNotMatch(await createReportPDF(report,{sections:["daily"]}).text(), /Top 3 individual scores/);
});
