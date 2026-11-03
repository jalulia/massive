import { formatHoursMinutes, formatMinutesSeconds } from "./data.mjs";
import { printFonts } from "./pdf-fonts.mjs";

const W = 612, H = 792, L = 43, R = W - L;
const number = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
});
const asDate = iso => new Date(iso + "T12:00:00Z");

// ASCII streams keep the PDF object's lengths and xref offsets byte-exact.
// Printable characters use the same WinAnsi mapping as the embedded fonts.
function codeOf(c) {
  if (c === "–") return 150;
  if (/\s/u.test(c)) return 32;
  return c.charCodeAt(0);
}
function literal(value) {
  return Array.from(String(value), c => {
    const code = codeOf(c);
    if ("()\\".includes(c)) return "\\" + c;
    if (code < 32 || code >= 127) return "\\" + code.toString(8).padStart(3, "0");
    return String.fromCharCode(code);
  }).join("");
}
function measure(value, face, size, track) {
  const text = String(value), widths = printFonts[face].widths;
  const units = Array.from(text).reduce((sum, c) => sum + widths[codeOf(c) - 32], 0);
  return size * units / 1000 + Math.max(0, text.length - 1) * track;
}
const coord = n => Number(n.toFixed(3));

function documentBlob(content, title) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R /Lang (en-US) >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /Display 4 0 R /Mono 7 0 R >> >> /Contents 10 0 R >>`,
  ];
  for (const f of [printFonts.Display, printFonts.Mono]) {
    const descriptor = objects.length + 2;
    objects.push(
      `<< /Type /Font /Subtype /TrueType /BaseFont /${f.name} /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 215 /Widths [${f.widths.join(" ")}] /FontDescriptor ${descriptor} 0 R >>`,
      `<< /Type /FontDescriptor /FontName /${f.name} /Flags ${f.flags} /FontBBox [${f.bbox.join(" ")}] /Ascent ${f.ascent} /Descent ${f.descent} /CapHeight ${f.capHeight} /StemV ${f.stem} /ItalicAngle 0 /FontFile2 ${descriptor + 1} 0 R >>`,
      `<< /Length ${f.hex.length + 1} /Length1 ${f.length} /Filter [/ASCIIHexDecode /FlateDecode] >>\nstream\n${f.hex}>\nendstream`,
    );
  }
  objects.push(
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    `<< /Title (${literal(title)}) /Author (MASSIVE) >>`,
  );
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info 11 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function createReportPDF(report, { sections = ["daily"], stage } = {}) {
  const ops = [];
  function text(value, x, y, size, face = "Mono", track = 0) {
    ops.push(`BT /${face} ${size} Tf ${track} Tc 1 0 0 1 ${coord(x)} ${coord(H - y)} Tm (${literal(value)}) Tj ET`);
  }
  function aligned(value, x, y, size, face = "Mono", track = 0) {
    text(value, x - measure(value, face, size, track), y, size, face, track);
  }
  function line(x1, y1, x2, y2, weight = 0.45) {
    ops.push(`${weight} w ${coord(x1)} ${coord(H-y1)} m ${coord(x2)} ${coord(H-y2)} l S`);
  }
  function rule(y, weight) { line(L, y, R, y, weight); }
  function mark(x, y, exit) {
    if (exit) {
      line(x-2.3, y-2.3, x+2.3, y+2.3, 1);
      line(x-2.3, y+2.3, x+2.3, y-2.3, 1);
    } else {
      // A short, round-capped stroke is a filled dot at any print resolution.
      ops.push(`q 1 J 4.2 w ${coord(x)} ${coord(H-y)} m ${coord(x + 0.001)} ${coord(H-y)} l S Q`);
    }
  }
  function heroMetric(x, y, label, value, size) {
    text(label, x, y, 8.5);
    text(value, x - size * 0.037, y + (report.fullEvent ? 56 : 59), size, "Display", -1.25);
  }
  function supportMetric(x, y, label, value) {
    text(label, x, y, 8.5);
    text(value, x - 1, y + 31, 26, "Display", -0.55);
  }

  const full = report.fullEvent;
  const days = sections.includes("daily") ? report.days : [];
  const level = sections.includes("levels") && report.levels?.find(item => item.name === stage);
  const combat = sections.includes("combat") && report.enemiesKilled !== null;
  const detail = level || combat;
  const scores = sections.includes("scores") && report.score;
  const col = (R - L) / (full ? 3 : 2);
  const first = asDate(report.from), last = asDate(report.to);
  const period = report.from === report.to ? dateFormat.format(first)
    : dateFormat.formatRange(first, last).replace(/\s*–\s*/g, "–");
  text("MUSEUM OF THE MOVING IMAGE", L, 38, 8, "Mono", 0.45);
  aligned("EVENT REPORT", R, 38, 8, "Mono", 0.45);
  rule(51, 1);
  text("MASSIVE at MoMI", L - 2.7, 110, 55, "Display", -1.55);
  text(period.toUpperCase() + "  ·  EDT", L, 137, 10.5);

  // Sparse selections retain their own rhythm on paper instead of leaving
  // the entire report parked in the top third of a Letter sheet.
  const primaryY = days.length ? 180 : 229;
  const supportY = days.length ? 317 : 480;
  rule(primaryY - 17);
  heroMetric(L, primaryY, "MATCHES STARTED", number.format(report.starts), full ? 63 : 66);
  heroMetric(L + col, primaryY, "PLAYER ENTRIES", number.format(report.entries), full ? 63 : 66);
  text(number.format(report.oneVsOne) + " × 2 players", L + col, primaryY + 74, 8.5);
  text(number.format(report.twoVsTwo) + " × 4 players", L + col, primaryY + 87, 8.5);
  if (full) {
    heroMetric(L + 2 * col, primaryY, "AVG. PLAY TIME PER ENTRY", formatMinutesSeconds(report.averageSecondsPerEntry), 42);
  }
  text("One entry per player slot per match. Repeat plays count.", L, primaryY + 108, 8.5);
  rule(supportY - 15);
  supportMetric(L, supportY, "ACTIVE MATCH TIME", formatHoursMinutes(report.activeMinutes));
  supportMetric(L + col, supportY, "MATCHES COMPLETED", `${report.completed} of ${report.starts}`);
  text(report.completionRate.toFixed(1) + "%", L + col, supportY + 46, 9);
  if (full) supportMetric(L + 2 * col, supportY, "COMBINED PLAYER TIME", formatHoursMinutes(report.playerMinutes));

  const annexTop = scores ? 638 : 619;
  const scoreTop = detail ? 533 : 622;
  const dailyTop = detail || scores ? 381 : 419;
  const dailyBottom = scores ? scoreTop - 9 : detail ? annexTop - 18 : 739;
  if (days.length > 1) {
    rule(dailyTop, 1);
    text("Matches by day", L - 1, dailyTop + 28, 25, "Display", -0.55);
    const ends = [192, 270, 365, 457, R];
    const header = dailyTop + 53;
    text("DATE", L, header, 7.7);
    ["STARTS", "ENTRIES", "ACTIVE TIME", "COMPLETED", "INACTIVITY EXITS"]
      .forEach((value, i) => aligned(value, ends[i], header, 7.7));
    const firstRule = header + 8;
    const rowStep = (dailyBottom - firstRule) / (days.length + 1);
    function ledgerRow(row, index, isTotal = false) {
      const top = firstRule + index * rowStep;
      line(L, top, R, top, isTotal ? 1 : 0.35);
      const y = top + rowStep * 0.64;
      if (isTotal) {
        text("Total", L - 0.5, y, Math.min(14, rowStep * .74), "Display");
      } else {
        text(row.date.slice(8), L - 0.6, y, Math.min(22, rowStep * 0.7), "Display", -0.5);
        text(weekday.format(asDate(row.date)).toUpperCase(), L + 32, y - 1, 8);
      }
      const values = [row.starts,row.entries,formatHoursMinutes(row.activeMinutes),row.completed,row.exits];
      values.forEach((value, i) => aligned(value, ends[i], y, isTotal ? 11.5 : 10.5));
    }
    days.forEach((row, i) => ledgerRow(row, i));
    ledgerRow(report, days.length, true);
  } else if (days.length === 1) {
    const day = days[0];
    rule(dailyTop, 1);
    text("Match completion", L - 1, dailyTop + 30, 27, "Display", -0.55);
    aligned(shortDay.format(asDate(day.date)).toUpperCase(), R, dailyTop + 27, 9);
    const fieldTop = dailyTop + 66;
    const rows = Math.ceil(day.starts / 10);
    const fieldHeight = (rows - 1) * 16;
    const base = fieldTop + (dailyBottom - 44 - fieldTop - fieldHeight) / 2;
    for (let i = 0; i < day.starts; i++) {
      const x = L + 6 + (i % 10) * 15 + Math.floor(i % 10 / 5) * 8;
      mark(x, base + Math.floor(i / 10) * 16, i >= day.completed);
    }
    const legendX = L + (R - L) / 2;
    const middle = (fieldTop + dailyBottom - 44) / 2;
    [[day.completed, "Completed", false], [day.exits, "Inactivity exits", true]]
      .forEach(([value, label, exit], i) => {
        const y = middle - 25 + i * 57;
        mark(legendX + 3, y - 3, exit);
        text(label, legendX + 17, y, 10);
        aligned(value, R, y + 5, 32, "Display", -0.5);
      });
    rule(dailyBottom - 23);
    text("1 mark = 1 match", L, dailyBottom - 5, 8.5);
  }

  if (scores) {
    const boardX = L + 205;
    rule(scoreTop, 1);
    text("Scores", L - 1, scoreTop + 23, 22, "Display", -0.45);
    text("COMPLETED MATCHES", L + 75, scoreTop + 21, 7.7);
    text("TOTAL TEAM SCORE", L, scoreTop + 42, 7.8);
    text(scores.total, L - 0.5, scoreTop + 60, 18, "Display", -0.35);
    text("AVG. SCORE PER PLAYER ENTRY", L, scoreTop + 77, 7.8);
    text(scores.average, L - 0.5, scoreTop + 95, 18, "Display", -0.35);

    text("Top 3 individual scores", boardX - 0.5, scoreTop + 22, 17, "Display", -0.3);
    scores.top.forEach((entry, index) => {
      const y = scoreTop + 45 + index * 23;
      line(boardX, y - 14, R, y - 14, 0.35);
      text(String(entry.rank).padStart(2, "0"), boardX, y, 9);
      text(shortDay.format(asDate(entry.date)).toUpperCase(), boardX + 23, y, 8);
      text(entry.level, boardX + 91, y, 8.5);
      text(entry.mode, boardX + 159, y, 8);
      const scoreWidth = R - boardX - 184;
      const size = Math.min(12, scoreWidth / measure(entry.value, "Mono", 1, 0));
      aligned(entry.value, R, y, Number(size.toFixed(2)));
    });
  }

  if (detail) {
    rule(annexTop, 1);
    const panels = [];
    if (level) panels.push(["Level · " + level.name, [
      ["Matches started", level.starts], ["Inactivity exits", level.exits], ["Share of starts", level.shareOfStarts.toFixed(1) + "%"],
    ]]);
    if (combat) panels.push(["Combat", [
      ["Enemies killed", number.format(report.enemiesKilled)], ["Enemies killed per match started", report.killsPerStart.toFixed(1)],
    ]]);
    panels.forEach(([title, data], i) => {
      const panelWidth = (R - L) / panels.length;
      const x = L + i * panelWidth + (i ? 14 : 0);
      const end = L + (i + 1) * panelWidth - (i + 1 < panels.length ? 16 : 0);
      text(title, x - 0.5, annexTop + 28, 21, "Display", -0.4);
      data.forEach(([key, value], j) => {
        const y = annexTop + 56 + j * 25;
        text(key, x, y, 9);
        aligned(value, end, y, 11);
        line(x, y + 8, end, y + 8, 0.3);
      });
    });
  }
  return documentBlob(ops.join("\n") + "\n", "MASSIVE at MoMI · " + period);
}

export function downloadReportPDF(report, options) {
  const url = URL.createObjectURL(createReportPDF(report, options));
  const link = document.createElement("a");
  const range = report.from === report.to ? report.from : report.from + "_" + report.to;
  link.href = url;
  link.download = `MASSIVE-MoMI-${range}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
