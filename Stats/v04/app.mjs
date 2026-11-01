import { buildReport, eventDates, formatHoursMinutes, formatMinutesSeconds } from "./data.mjs";
import { animateHero, stageAnimation } from "./motion.mjs";
import { downloadReportPDF } from "./pdf.mjs";

const $ = id => document.getElementById(id);
const sections = ["daily", "levels", "combat"];
const datesInWords = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
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

function dayColumn(day, drillDown) {
  const label = shortDate.format(dateObject(day.date));
  const column = document.createElement(drillDown ? "button" : "div");
  if (drillDown) column.type = "button";
  column.className = "day-column";
  column.dataset.date = day.date;
  if (drillDown) column.setAttribute("aria-label", `${label}, ${day.starts} starts, ${day.entries} entries, ${formatHoursMinutes(day.activeMinutes)} active, ${day.completed} completed, ${day.exits} inactivity exits. View this day.`);
  column.innerHTML = `<span class="day-label">${label}</span>
    <span class="day-starts">${day.starts} <small>starts</small></span>
    <span class="day-marks" aria-hidden="true">${"<i></i>".repeat(day.completed)}${'<i class="exit">×</i>'.repeat(day.exits)}</span>
    <span class="day-data">
      <span><small>Player entries</small><b>${day.entries}</b></span>
      <span><small>Active time</small><b>${formatHoursMinutes(day.activeMinutes)}</b></span>
      <span><small>Completed</small><b>${day.completed}</b></span>
      <span><small>Inactivity exits</small><b>${day.exits}</b></span>
    </span>`;
  return column;
}

async function start() {
  const response = await fetch("../v03/snapshot.json");
  if (!response.ok) throw new Error("Match data unavailable");
  const snapshot = await response.json();
  const dates = eventDates(snapshot);
  const startDate = dates[0], endDate = dates.at(-1);
  const selectClip = stageAnimation($("stage-video"), $("stage-poster"));
  let report, selected, stage;

  function visibleSections() {
    return sections.filter(name => selected.has(name) && (name === "daily" || report.fullEvent));
  }

  function reportURL() {
    const url = new URL("./", location.href);
    if (!report.fullEvent) {
      url.searchParams.set("from", report.from);
      url.searchParams.set("to", report.to);
    }
    const visible = visibleSections();
    if (visible.join(",") !== "daily") url.searchParams.set("sections", visible.join(",") || "summary");
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
    set("report-window", windowLabel);
    document.title = "MASSIVE at MoMI · " + windowLabel;
    $("range-from").value = report.from;
    $("range-to").value = report.to;
    set("range-error", "");
    $("export-error").hidden = true;
    for (const btn of $("date-presets").querySelectorAll("[data-date]")) {
      const active = btn.dataset.date === "all" ? report.fullEvent : report.from === report.to && btn.dataset.date === report.from;
      btn.setAttribute("aria-pressed", String(active));
    }
    const custom = !report.fullEvent && report.from !== report.to;
    $("range-picker").dataset.active = String(custom);
    $("range-toggle").setAttribute("aria-label", custom ? "Change date range, " + windowLabel : "Custom date range");
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
      section.hidden = name !== "daily" && !report.fullEvent;
      section.dataset.open = String(open);
      toggle.setAttribute("aria-expanded", String(open));
      $(toggle.getAttribute("aria-controls")).hidden = !open;
    }
    $("daily").querySelector(".chart-legend").hidden = !visible.includes("daily");
    $("levels").querySelector(".select-label").hidden = !visible.includes("levels");
    $("day-chart").replaceChildren(...(visible.includes("daily") ? report.days.map(day => dayColumn(day, report.days.length > 1)) : []));
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
    try { report = buildReport(snapshot, from, to); }
    catch { report = buildReport(snapshot); invalid = true; }
    const requested = (params.get("sections") ?? "daily").split(",");
    selected = new Set(sections.filter(name => requested.includes(name)));
    const fallback = Object.keys(snapshot.levels).sort((a, b) => snapshot.levels[b].starts - snapshot.levels[a].starts || a.localeCompare(b))[0];
    const level = params.get("level");
    stage = Object.hasOwn(snapshot.levels, level) ? level : fallback;
    render();
    if (invalid) {
      $("range-picker").open = true;
      set("range-error", "Invalid date range. Showing the full event.");
    }
  }

  function updateRange(from, to) {
    try { report = buildReport(snapshot, from, to); }
    catch { set("range-error", "Choose an end date on or after the start date, within the event."); return false; }
    $("range-picker").open = false;
    render();
    writeHistory();
    return true;
  }

  function chooseStage(name) {
    if (!report.levels?.some(level => level.name === name)) return;
    stage = name;
    renderStage();
    writeHistory();
  }

  readLocation();
  animateHero($("hero-art"));
  for (const input of [$("range-from"), $("range-to")]) {
    input.min = startDate;
    input.max = endDate;
  }
  $("date-presets").addEventListener("click", event => {
    const date = event.target.closest("button[data-date]")?.dataset.date;
    if (date) updateRange(date === "all" ? startDate : date, date === "all" ? endDate : date);
  });
  $("day-chart").addEventListener("click", event => {
    const date = event.target.closest("button[data-date]")?.dataset.date;
    if (date && updateRange(date, date)) $("date-presets").querySelector('[aria-pressed="true"]').focus();
  });
  $("range-form").addEventListener("submit", event => {
    event.preventDefault();
    if (updateRange($("range-from").value, $("range-to").value)) $("range-picker").querySelector("summary").focus();
  });
  const picker = $("range-picker");
  document.addEventListener("click", event => {
    if (!picker.contains(event.target)) picker.open = false;
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && picker.open) {
      picker.open = false;
      $("range-toggle").focus();
    }
  });
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
