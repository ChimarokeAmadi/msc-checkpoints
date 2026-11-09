// Small SVG chart helpers for the report (no chart library: the report is a
// static PDF, so every chart is plain SVG with its values labelled).
//
// Colours are CSS variables defined in the report (--s1 Redis, --s2 MongoDB,
// --s3 Redis + AOF), so each database keeps the same colour in every chart.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Clean axis maximum and ticks (1, 2, 2.5, 5 x 10^n)
function niceScale(max, ticks = 4) {
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  const list = [];
  for (let v = 0; v <= top + step / 1e6; v += step) list.push(Number(v.toFixed(10)));
  return { top, ticks: list };
}

function fmtNum(v, digits) {
  if (digits != null) return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (v >= 10000) return `${Math.round(v / 1000)}K`;
  if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (v >= 10) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

// Bar with a 4px rounded end and a square base (horizontal: grows to the right)
function hBar(x, y, w, h, fill) {
  if (w <= 0) return '';
  const r = Math.min(4, w, h / 2);
  return `<path d="M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z" fill="${fill}"/>`;
}

function legend(series) {
  return `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}

// Horizontal grouped bars: one group per category, one bar per series.
// rows: [{ label, values: [v1, v2, ...] }]
function groupedBars({ rows, series, unit = '', width = 640, barH = 14, gap = 2, groupGap = 14, labelW = 170, digits }) {
  const max = Math.max(...rows.flatMap((r) => r.values));
  const { top, ticks } = niceScale(max);
  const plotW = width - labelW - 60;
  const groupH = series.length * barH + (series.length - 1) * gap;
  const height = rows.length * (groupH + groupGap) + 24;
  const x = (v) => labelW + (v / top) * plotW;
  let svg = '';
  for (const t of ticks) {
    svg += `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${height - 20}" class="grid"/>`;
    svg += `<text x="${x(t)}" y="${height - 6}" class="tick" text-anchor="middle">${fmtNum(t)}${t === ticks.at(-1) && unit ? ` ${esc(unit)}` : ''}</text>`;
  }
  rows.forEach((row, i) => {
    const y0 = i * (groupH + groupGap) + 4;
    svg += `<text x="${labelW - 10}" y="${y0 + groupH / 2 + 4}" class="label" text-anchor="end">${esc(row.label)}</text>`;
    row.values.forEach((v, j) => {
      const y = y0 + j * (barH + gap);
      svg += hBar(labelW, y, x(v) - labelW, barH, series[j].color);
      svg += `<text x="${x(v) + 5}" y="${y + barH - 3}" class="value">${fmtNum(v, digits)}</text>`;
    });
  });
  return `${legend(series)}<svg viewBox="0 0 ${width} ${height}" width="100%" role="img">${svg}</svg>`;
}

// Line chart over a few categorical x positions (e.g. 1, 8, 32, 128 users)
function lineChart({ xs, series, width = 300, height = 190, unit = '', xLabel = '', yMax }) {
  const pad = { l: 44, r: 52, t: 10, b: 34 };
  const max = yMax ?? Math.max(...series.flatMap((s) => s.values));
  const { top, ticks } = niceScale(max);
  const px = (i) => pad.l + (i / (xs.length - 1)) * (width - pad.l - pad.r);
  const py = (v) => height - pad.b - (v / top) * (height - pad.t - pad.b);
  let svg = '';
  for (const t of ticks) {
    svg += `<line x1="${pad.l}" x2="${width - pad.r}" y1="${py(t)}" y2="${py(t)}" class="grid"/>`;
    svg += `<text x="${pad.l - 6}" y="${py(t) + 3.5}" class="tick" text-anchor="end">${fmtNum(t)}</text>`;
  }
  xs.forEach((x, i) => {
    svg += `<text x="${px(i)}" y="${height - pad.b + 14}" class="tick" text-anchor="middle">${esc(x)}</text>`;
  });
  if (xLabel) svg += `<text x="${(pad.l + width - pad.r) / 2}" y="${height - 4}" class="tick" text-anchor="middle">${esc(xLabel)}</text>`;
  for (const s of series) {
    svg += `<polyline points="${s.values.map((v, i) => `${px(i)},${py(v)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.values.forEach((v, i) => {
      svg += `<circle cx="${px(i)}" cy="${py(v)}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
    });
    const last = s.values.length - 1;
    const end = s.values[last];
    svg += `<text x="${px(last) + 8}" y="${py(end) + 4}" class="value">${end >= 1000 ? `${(end / 1000).toFixed(1)}K` : fmtNum(end)}${unit ? ` ${esc(unit)}` : ''}</text>`;
  }
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img">${svg}</svg>`;
}

module.exports = { groupedBars, lineChart, legend, fmtNum, esc };
