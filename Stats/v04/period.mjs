const weekdays = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const shortDates = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDates = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" });

export function setupPeriod(dates, onChange) {
  const byId = id => document.getElementById(id);
  const picker = byId("period-picker");
  const toggle = byId("period-toggle");
  const label = byId("report-window");
  const custom = byId("period-custom");
  const form = byId("period-range");
  const from = byId("period-from");
  const to = byId("period-to");
  const error = byId("period-error");
  const first = dates[0], last = dates.at(-1);
  let current;

  for (const iso of dates) {
    const date = new Date(iso + "T12:00:00Z");
    const day = document.createElement("button");
    day.type = "button";
    day.dataset.period = iso;
    day.setAttribute("aria-label", fullDates.format(date));
    const weekday = document.createElement("span");
    weekday.textContent = weekdays.format(date);
    const ordinal = document.createElement("strong");
    ordinal.textContent = date.getUTCDate();
    day.append(weekday, ordinal);
    byId("period-days").append(day);
    from.add(new Option(shortDates.format(date), iso));
    to.add(new Option(shortDates.format(date), iso));
  }

  function boundEnd() {
    for (const option of to.options) option.disabled = option.value < from.value;
    if (to.value < from.value) to.value = from.value;
  }

  function showRange(open) {
    custom.setAttribute("aria-expanded", String(open));
    form.hidden = !open;
  }

  function resetForm() {
    from.value = current.from;
    to.value = current.to;
    boundEnd();
    showRange(!current.fullEvent && current.from !== current.to);
  }

  function close() {
    // Park focus on a persistent element before hiding its focused descendant.
    toggle.focus({ preventScroll: true });
    picker.open = false;
  }

  function apply(start, end) {
    const unchanged = start === current.from && end === current.to;
    if (unchanged || onChange(start, end) !== false) close();
  }

  picker.addEventListener("click", event => {
    const button = event.target.closest("button[data-period]");
    if (!button) return;
    const key = button.dataset.period;
    apply(key === "all" ? first : key, key === "all" ? last : key);
  });
  custom.addEventListener("click", () => showRange(form.hidden));
  from.addEventListener("change", boundEnd);
  form.addEventListener("submit", event => {
    event.preventDefault();
    apply(from.value, to.value);
  });
  picker.addEventListener("toggle", () => {
    if (picker.open && current) resetForm();
    if (!picker.open) error.textContent = "";
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && picker.open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });
  picker.addEventListener("focusout", event => {
    if (event.relatedTarget && !picker.contains(event.relatedTarget)) picker.open = false;
  });
  document.addEventListener("click", event => {
    if (picker.open && !picker.contains(event.target)) picker.open = false;
  });

  return {
    render(report, windowLabel) {
      const changed = !current || current.from !== report.from || current.to !== report.to;
      current = report;
      label.textContent = windowLabel;
      if (!changed) return;
      const selected = report.fullEvent ? "all" : report.from === report.to ? report.from : null;
      for (const button of picker.querySelectorAll("[data-period]")) {
        const date = button.dataset.period;
        button.setAttribute("aria-pressed", String(date === selected));
        button.toggleAttribute("data-in-range", !selected && date >= report.from && date <= report.to);
      }
      resetForm();
      error.textContent = "";
    },
    invalid(message = "Invalid report dates. Showing the full event.") {
      picker.open = true;
      error.textContent = message;
    },
  };
}
