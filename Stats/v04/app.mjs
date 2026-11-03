import { buildReport, eventDates, formatHoursMinutes, formatMinutesSeconds } from "./data.mjs?v=4";
import { setupPeriod } from "./period.mjs";
import { setupDaily } from "./daily.mjs";
import { animateHero, stageAnimation } from "./motion.mjs";
import { downloadReportPDF } from "./pdf.mjs?v=4";

const $ = id => document.getElementById(id);
const sections = ["daily", "scores", "levels", "combat"];
const datesInWords = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});
const dateObject = iso => new Date(iso + "T12:00:00Z");
const number = new Intl.NumberFormat("en-US");
const set = (id, value) => { $(id).textContent = value; };
function setDuration(id, value) {
  const parts = value.match(/\d+|[hms]| +/g) ?? [];
  $(id).replaceChildren(...parts.map(part => {
    if (!/^[hms]$/.test(part)) return document.createTextNode(part);
    const unit = document.createElement("small");
    unit.className = "time-unit";
    unit.textContent = part;
    return unit;
  }));
}

function rangeLabel(from, to) {
  const a = dateObject(from), b = dateObject(to);
  return (from === to ? datesInWords.format(a) : datesInWords.formatRange(a, b).replace(/\s*–\s*/g, "–")) + " · EDT";
}

async function start() {
  const response = await fetch("../v03/snapshot.json");
  if (!response.ok) throw new Error("Match data unavailable");
  const [snapshot, scoreDays] = await Promise.all([
    response.json(),
    fetch("./score-days.json").then(res => res.ok ? res.json() : null).catch(() => null),
  ]);
  const defaultSections = scoreDays ? "daily,scores" : "daily";
  const dates = eventDates(snapshot);
  const startDate = dates[0], endDate = dates.at(-1);
  const selectClip = stageAnimation($("stage-video"), $("stage-poster"));
  let report, selected, stage;
  const period = setupPeriod(dates, updateRange);
  const renderDays = setupDaily($("day-chart"));

  function available(name) {
    if (name === "scores") return Boolean(report.score);
    return name === "daily" || report.fullEvent;
  }

  function visibleSections() {
    return sections.filter(name => selected.has(name) && available(name));
  }

  function reportURL() {
    const url = new URL("./", location.href);
    if (!report.fullEvent) {
      url.searchParams.set("from", report.from);
      url.searchParams.set("to", report.to);
    }
    const visible = visibleSections();
    if (visible.join(",") !== defaultSections) url.searchParams.set("sections", visible.join(",") || "summary");
    if (visible.includes("levels")) url.searchParams.set("level", stage);
    return url;
  }

  function writeHistory() {
    const url = reportURL();
    if (url.href !== location.href) history.pushState(null, "", url);
  }

  function renderStage() {
    if ($("level-content").hidden) { selectClip(null); return; }
    const levels = [...report.levels];
    if ($("stage-sort").value === "name") levels.sort((a, b) => a.name.localeCompare(b.name));
    const level = levels.find(item => item.name === stage);
    $("stage-select").replaceChildren(...levels.map(item => new Option(item.name, item.name)));
    $("stage-select").value = stage;
    $("stage-tabs").replaceChildren(...levels.map(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.level = item.name;
      button.textContent = item.name;
      button.setAttribute("aria-pressed", String(item.name === stage));
      return button;
    }));
    set("stage-name", stage);
    set("stage-starts", level.starts);
    set("stage-exits", level.exits);
    set("stage-share", level.shareOfStarts.toFixed(1) + "%");
    selectClip(stage);
  }

  function render() {
    const windowLabel = rangeLabel(report.from, report.to);
    document.title = "MASSIVE at MoMI · " + windowLabel;
    period.render(report, windowLabel);
    set("print-period", windowLabel);
    $("print-report").setAttribute("aria-label", "Print PDF for " + windowLabel);
    $("export-error").hidden = true;
    set("starts", report.starts);
    set("entries", report.entries);
    set("mode-1v1", report.oneVsOne);
    set("mode-2v2", report.twoVsTwo);
    setDuration("active-time", formatHoursMinutes(report.activeMinutes));
    set("completed", report.completed + " of " + report.starts);
    set("completion-rate", report.completionRate.toFixed(1) + "%");
    $("average-metric").hidden = $("player-time-metric").hidden = !report.fullEvent;
    setDuration("average-time", report.fullEvent ? formatMinutesSeconds(report.averageSecondsPerEntry) : "");
    setDuration("player-time", report.fullEvent ? formatHoursMinutes(report.playerMinutes) : "");
    const visible = visibleSections();
    for (const name of sections) {
      const section = $(name);
      const open = visible.includes(name);
      const toggle = section.querySelector(".section-toggle");
      section.hidden = !available(name);
      section.dataset.open = String(open);
      toggle.setAttribute("aria-expanded", String(open));
      $(toggle.getAttribute("aria-controls")).hidden = !open;
    }
    $("daily").querySelector(".chart-legend").hidden = !visible.includes("daily");
    $("levels").querySelector(".select-label").hidden = !visible.includes("levels");
    if (visible.includes("scores")) {
      const score = report.score;
      set("score-scope", number.format(report.completed) + " completed matches");
      set("score-total", score.total);
      set("score-average", score.average);
      set("score-entries", number.format(score.entries) + " player entries");
      $("score-rows").replaceChildren(...score.top.map(item => {
        const tr = document.createElement("tr");
        const day = dateObject(item.date).toLocaleDateString("en-GB", {day:"numeric", month:"short", timeZone:"UTC"});
        for (const value of [String(item.rank).padStart(2, "0"), item.level, item.mode, day, item.value]) {
          tr.insertCell().textContent = value;
        }
        return tr;
      }));
    }
    renderDays(report.days);
    renderStage();
    set("kill-total", visible.includes("combat") ? number.format(report.enemiesKilled) : "");
    set("kills-per-match", visible.includes("combat") ? report.killsPerStart.toFixed(1) : "");
    $("report-status").textContent = `${windowLabel}. ${report.starts} matches started. ${report.entries} player entries.`;
    document.body.dataset.ready = "true";
  }

  function readLocation() {
    const params = new URL(location.href).searchParams;
    const from = params.get("from") ?? params.get("to") ?? startDate;
    const to = params.get("to") ?? params.get("from") ?? endDate;
    let invalid = false;
    try { report = buildReport(snapshot, from, to, scoreDays); }
    catch { report = buildReport(snapshot, startDate, endDate, scoreDays); invalid = true; }
    const requested = (params.get("sections") ?? defaultSections).split(",");
    selected = new Set(sections.filter(name => requested.includes(name)));
    const fallback = Object.keys(snapshot.levels).sort((a, b) => snapshot.levels[b].starts - snapshot.levels[a].starts || a.localeCompare(b))[0];
    const level = params.get("level");
    stage = Object.hasOwn(snapshot.levels, level) ? level : fallback;
    render();
    if (invalid) {
      history.replaceState(null, "", reportURL());
      period.invalid();
    }
  }

  function updateRange(from, to) {
    if (report.from === from && report.to === to) return;
    report = buildReport(snapshot, from, to, scoreDays);
    render();
    writeHistory();
  }

  function chooseStage(name) {
    if (!report.levels?.some(level => level.name === name)) return;
    stage = name;
    renderStage();
    writeHistory();
  }

  readLocation();
  animateHero($("hero-art"));
  sections.forEach(name => {
    $(name).querySelector(".section-toggle").addEventListener("click", () => {
      if (selected.has(name)) selected.delete(name); else selected.add(name);
      render();
      writeHistory();
    });
  });
  $("stage-select").addEventListener("change", event => chooseStage(event.target.value));
  $("stage-sort").addEventListener("change", renderStage);
  $("stage-tabs").addEventListener("click", event => {
    const name = event.target.closest("button[data-level]")?.dataset.level;
    if (name) {
      chooseStage(name);
      $("stage-tabs").querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
    }
  });
  const print = $("print-report");
  print.disabled = false;
  print.addEventListener("click", () => {
    $("export-error").hidden = true;
    try {
      downloadReportPDF(report, { sections: visibleSections(), stage });
    } catch (error) {
      set("export-error", "PDF download failed. Try again.");
      $("export-error").hidden = false;
      console.error(error);
    }
  });
  window.addEventListener("popstate", readLocation);
}

start().catch(error => {
  $("load-error").hidden = false;
  console.error(error);
});
