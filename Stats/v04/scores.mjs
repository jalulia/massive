const units = ["meV", "eV", "keV", "MeV", "GeV", "TeV"];
const digits = new Intl.NumberFormat("en-US");

// Keep the cabinet's integer meV through aggregation and sorting. Compact
// totals on display. Preserve all digits for individual ranked performances.
function energy(amount, exact = false) {
  let scale = 1n;
  let tier = 0;
  while (tier < units.length - 1 && amount >= scale * 1000n) {
    scale *= 1000n;
    tier++;
  }
  const fraction = (amount % scale).toString().padStart(tier * 3, "0");
  const decimal = (exact ? fraction : fraction.slice(0, 3)).replace(/0+$/, "");
  return digits.format(amount / scale) + (decimal ? "." + decimal : "") + " " + units[tier];
}

export function scoresForDays(days, source) {
  if (!source || days.some(day => !source[day.date])) return null;
  let team = 0n, individual = 0n, entries = 0n;
  const performances = [];
  for (const {date} of days) {
    const row = source[date];
    team += BigInt(row.teamMeV);
    individual += BigInt(row.playerMeV);
    entries += BigInt(row.entries);
    for (const entry of row.top) performances.push({...entry, date, amount: BigInt(entry.meV)});
  }
  if (!entries) return null;
  performances.sort((a, b) => a.amount === b.amount ? 0 : a.amount > b.amount ? -1 : 1);
  let rank = 0;
  const top = performances.slice(0, 3).map((entry, index) => {
    if (!index || entry.amount !== performances[index - 1].amount) rank = index + 1;
    return {rank, date: entry.date, level: entry.level, mode: entry.mode, value: energy(entry.amount, true)};
  });
  return {total: energy(team), average: energy((individual + entries / 2n) / entries), entries: Number(entries), top};
}
