// The export already groups match starts by the venue's local calendar dates.
export function eventDates(snapshot) {
  return Object.keys(snapshot.days).sort();
}

function per(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function percent(part, total) {
  return per(part * 100, total);
}

export function buildReport(snapshot, from, to) {
  const dates = eventDates(snapshot);
  from ??= dates[0];
  to ??= dates.at(-1);
  if (!dates.includes(from) || !dates.includes(to) || from > to) {
    throw new RangeError("Choose a date range within the event.");
  }

  const fullEvent = from === dates[0] && to === dates.at(-1);
  const days = dates.filter(date => date >= from && date <= to).map(date => {
    const row = snapshot.days[date];
    const oneVsOne = row.modes["1v1"] ?? 0;
    const twoVsTwo = row.modes["2v2"] ?? 0;
    return {
      date,
      starts: row.starts,
      completed: row.status.Completed ?? 0,
      exits: row.status.Abandoned ?? 0,
      oneVsOne,
      twoVsTwo,
      entries: 2 * oneVsOne + 4 * twoVsTwo,
      activeMinutes: row.active_minutes,
    };
  });
  const sum = field => days.reduce((total, day) => total + day[field], 0);
  const starts = sum("starts");
  const entries = sum("entries");
  const completed = sum("completed");
  const playerMinutes = fullEvent ? snapshot.totals.player_minutes : null;
  const enemiesKilled = fullEvent ? snapshot.totals.enemies_killed : null;
  const levels = fullEvent
    ? Object.entries(snapshot.levels).map(([name, row]) => ({
        name,
        starts: row.starts,
        exits: row.status.Abandoned ?? 0,
        shareOfStarts: percent(row.starts, starts),
      })).sort((a, b) => b.starts - a.starts || a.name.localeCompare(b.name))
    : null;

  return {
    from, to, fullEvent, days, starts, entries, completed,
    exits: sum("exits"),
    oneVsOne: sum("oneVsOne"),
    twoVsTwo: sum("twoVsTwo"),
    activeMinutes: sum("activeMinutes"),
    completionRate: percent(completed, starts),
    playerMinutes,
    averageSecondsPerEntry: fullEvent ? per(playerMinutes * 60, entries) : null,
    levels,
    enemiesKilled,
    killsPerStart: fullEvent ? per(enemiesKilled, starts) : null,
  };
}

export function formatHoursMinutes(minutes) {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  return hours ? `${hours}h ${String(rounded % 60).padStart(2, "0")}m` : `${rounded}m`;
}

export function formatMinutesSeconds(seconds) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}m ${String(rounded % 60).padStart(2, "0")}s`;
}
