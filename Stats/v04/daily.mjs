import { formatHoursMinutes } from "./data.mjs";

const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
});
const fields = [
  ["entries", "Player entries"],
  ["activeMinutes", "Active match time"],
  ["oneVsOne", "1v1 matches"],
  ["twoVsTwo", "2v2 matches"],
  ["completed", "Completed"],
  ["exits", "Inactivity exits"],
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function value(day, key) {
  return key === "activeMinutes" ? formatHoursMinutes(day[key]) : day[key];
}

function createDay(day, id, interactive) {
  const date = new Date(day.date + "T12:00:00Z");
  const column = element(interactive ? "button" : "div", "daily-tab");
  column.id = id;
  column.dataset.date = day.date;
  if (interactive) {
    column.type = "button";
    column.setAttribute("role", "tab");
    column.setAttribute("aria-label", fullDate.format(date) + ", " + day.starts + " matches started");
  }
  const label = element("span", "daily-date", dayName.format(date) + " " + date.getUTCDate());
  const matrix = element("span", "daily-matrix");
  matrix.setAttribute("aria-hidden", "true");
  // The first ten matches occupy the bottom row. The last row may be partial.
  for (let i = 0; i < day.starts; i += 10) {
    const band = element("span", "daily-band");
    for (let j = i; j < Math.min(i + 10, day.starts); j++) {
      band.append(element("i", j < day.completed ? "daily-mark" : "daily-mark daily-exit"));
    }
    matrix.append(band);
  }
  const total = element("span", "daily-total");
  total.append(element("span", "daily-count", day.starts), element("span", "daily-unit", "starts"));
  column.append(label, matrix, total);
  return column;
}

export function setupDaily(container) {
  const explorer = element("div", "daily-explorer");
  const plot = element("div", "daily-plot");
  const detail = element("div", "daily-readout");
  detail.id = container.id + "-detail";
  const title = element("h3", "daily-detail-date");
  title.id = detail.id + "-date";
  const list = element("dl", "daily-values");
  const values = new Map();
  for (const [key, label] of fields) {
    const pair = element("div", "daily-stat");
    const reading = element("dd");
    pair.dataset.metric = key;
    pair.append(element("dt", null, label), reading);
    list.append(pair);
    values.set(key, reading);
  }
  detail.append(title, list);
  explorer.append(plot, detail);

  const table = element("table", "daily-print");
  const head = table.createTHead().insertRow();
  for (const label of ["Date", "Starts", ...fields.map(([, label]) => label)]) {
    const th = element("th", null, label);
    th.scope = "col";
    head.append(th);
  }
  const body = table.createTBody();
  container.replaceChildren(explorer, table);
  let days = [];
  let selected;
  let dateKey;

  function inspect(index) {
    const day = days[index];
    selected = day.date;
    const active = plot.children[index];
    if (days.length > 1) {
      for (const tab of plot.children) {
        tab.setAttribute("aria-selected", String(tab === active));
        tab.tabIndex = tab === active ? 0 : -1;
      }
      detail.setAttribute("aria-labelledby", active.id);
    }
    title.textContent = fullDate.format(new Date(day.date + "T12:00:00Z"));
    for (const [key, node] of values) node.textContent = value(day, key);
  }

  plot.addEventListener("click", event => {
    const tab = event.target.closest("button.daily-tab");
    if (!tab) return;
    if (tab.dataset.date !== selected) {
      inspect(days.findIndex(day => day.date === tab.dataset.date));
    }
    if (document.activeElement !== tab) tab.focus({ preventScroll: true });
  });
  plot.addEventListener("keydown", event => {
    const tab = event.target.closest("button.daily-tab");
    if (!tab || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const index = days.findIndex(day => day.date === tab.dataset.date);
    let next;
    switch (event.key) {
      case "ArrowLeft": next = (index - 1 + days.length) % days.length; break;
      case "ArrowRight": next = (index + 1) % days.length; break;
      case "Home": next = 0; break;
      case "End": next = days.length - 1; break;
      default: return;
    }
    event.preventDefault();
    inspect(next);
    plot.children[next].focus({ preventScroll: true });
  });

  return function renderDays(nextDays) {
    const nextKey = nextDays.map(day => day.date).join("|");
    if (nextKey === dateKey) return;
    dateKey = nextKey;
    const restoreFocus = plot.contains(document.activeElement);
    days = nextDays;
    const interactive = days.length > 1;
    explorer.dataset.count = days.length;
    plot.style.setProperty("--day-count", days.length);
    plot.style.setProperty("--row-count", Math.max(1, ...days.map(day => Math.ceil(day.starts / 10))));
    plot.setAttribute("role", interactive ? "tablist" : "group");
    plot.setAttribute("aria-label", interactive ? "Inspect a day" : "Daily match starts");
    detail.setAttribute("role", interactive ? "tabpanel" : "region");
    detail.setAttribute("aria-labelledby", title.id);
    detail.tabIndex = interactive ? 0 : -1;
    plot.replaceChildren();
    body.replaceChildren();
    for (const day of days) {
      const column = createDay(day, container.id + "-" + day.date, interactive);
      if (interactive) column.setAttribute("aria-controls", detail.id);
      plot.append(column);
      const row = body.insertRow();
      const label = element("th", null, fullDate.format(new Date(day.date + "T12:00:00Z")));
      label.scope = "row";
      row.append(label);
      for (const key of ["starts", ...values.keys()]) row.insertCell().textContent = value(day, key);
    }
    const index = Math.max(0, days.findIndex(day => day.date === selected));
    inspect(index);
    if (restoreFocus) {
      (interactive ? plot.children[index] : detail).focus({ preventScroll: true });
    }
  };
}
