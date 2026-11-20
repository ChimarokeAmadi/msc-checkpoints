// Turns results/*.json into results/RESULTS.md (tables) and one SVG chart per
// CPU setting. Run with: npm run chart
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'results');
const FRAMEWORKS = ['React', 'Angular', 'Vue', 'Svelte'];
const OPS = ['render100', 'render500', 'render1000', 'update50', 'delete50'];
// Colour-blind safe, validated order (light and dark steps of the same hues).
const LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const DARK = ['#3987e5', '#d95926', '#199e70', '#c98500'];

const files = readdirSync(dir).filter((f) => /^results-cpu\d+x\.json$/.test(f)).sort();
const all = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = (n) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));

function svgChart(r) {
  const panels = OPS.map((key) => ({
    title: r.frameworks.React.operations[key].label,
    unit: 'ms',
    values: FRAMEWORKS.map((f) => r.frameworks[f].operations[key].busy.median),
    detail: FRAMEWORKS.map((f) => {
      const o = r.frameworks[f].operations[key];
      return `${f}: ${o.busy.median.toFixed(1)} ms main-thread time (±${o.busy.sd.toFixed(1)}), ${o.total.median.toFixed(1)} ms to paint`;
    }),
  }));
  panels.push({
    title: 'JS memory with 1000 tasks',
    unit: 'MB',
    values: FRAMEWORKS.map((f) => r.frameworks[f].memory.heap1000MB),
    detail: FRAMEWORKS.map((f) => `${f}: ${r.frameworks[f].memory.heap1000MB.toFixed(2)} MB JS heap, ${r.frameworks[f].memory.domNodes1000} DOM nodes`),
  });

  const W = 880, colW = 410, gutter = 60, top = 92, panelH = 168, barH = 18, rowH = 30, labelW = 70, valueW = 64;
  const H = top + Math.ceil(panels.length / 2) * panelH + 10;
  const plotW = colW - labelW - valueW;
  let body = '';
  panels.forEach((p, i) => {
    const x0 = (i % 2) * (colW + gutter);
    const y0 = top + Math.floor(i / 2) * panelH;
    const max = Math.max(...p.values) * 1.0;
    body += `<text x="${x0}" y="${y0}" class="panel-title">${esc(p.title)} <tspan class="muted">(${p.unit})</tspan></text>`;
    const by = y0 + 16;
    body += `<line x1="${x0 + labelW}" x2="${x0 + labelW}" y1="${by - 4}" y2="${by + rowH * 4 - 6}" class="axis"/>`;
    p.values.forEach((v, j) => {
      const y = by + j * rowH;
      const w = Math.max(2, (v / max) * plotW);
      const r4 = Math.min(4, w);
      const bx = x0 + labelW;
      // Square at the baseline, 4px rounded at the data end.
      const d = `M${bx},${y} h${w - r4} a${r4},${r4} 0 0 1 ${r4},${r4} v${barH - 2 * r4} a${r4},${r4} 0 0 1 -${r4},${r4} h-${w - r4} z`;
      const best = v === Math.min(...p.values);
      body += `<g><title>${esc(p.detail[j])}</title>`;
      body += `<rect x="${x0}" y="${y - 6}" width="${colW}" height="${rowH}" fill="transparent"/>`;
      body += `<text x="${bx - 8}" y="${y + 13}" class="label" text-anchor="end">${FRAMEWORKS[j]}</text>`;
      body += `<path d="${d}" class="s${j}"/>`;
      body += `<text x="${bx + w + 6}" y="${y + 13}" class="value${best ? ' best' : ''}">${fmt(v)}</text>`;
      body += `</g>`;
    });
  });
  const legend = FRAMEWORKS.map((f, j) => `<rect x="${j * 96}" y="52" width="12" height="12" rx="3" class="s${j}"/><text x="${j * 96 + 18}" y="62" class="label">${f}</text>`).join('');
  const cpu = r.cpuSlowdown > 1 ? `CPU slowed down ${r.cpuSlowdown}× (like a mid-range phone)` : 'normal CPU speed (MacBook)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" role="img" aria-labelledby="t d">
<title id="t">DOM benchmark: React, Angular, Vue and Svelte</title>
<desc id="d">Median main-thread time of ${r.runs} runs per operation, ${cpu}. Lower is better.</desc>
<style>
  .bg { fill: #fcfcfb; }
  .title { font-size: 18px; font-weight: 650; fill: #0b0b0b; }
  .sub, .muted { fill: #52514e; font-weight: 400; }
  .sub { font-size: 13px; }
  .panel-title { font-size: 14px; font-weight: 600; fill: #0b0b0b; }
  .label { font-size: 13px; fill: #52514e; }
  .value { font-size: 12.5px; fill: #0b0b0b; font-variant-numeric: tabular-nums; }
  .best { font-weight: 700; }
  .axis { stroke: #c3c2b7; stroke-width: 1; }
  ${LIGHT.map((c, j) => `.s${j} { fill: ${c}; }`).join(' ')}
  @media (prefers-color-scheme: dark) {
    .bg { fill: #1a1a19; }
    .title, .panel-title, .value { fill: #f0efec; }
    .sub, .muted, .label { fill: #c3c2b7; }
    .axis { stroke: #383835; }
    ${DARK.map((c, j) => `.s${j} { fill: ${c}; }`).join(' ')}
  }
</style>
<rect class="bg" width="${W}" height="${H}" rx="10"/>
<g transform="translate(24,0)">
<text x="0" y="30" class="title">Main-thread time per DOM operation · lower is better</text>
<text x="${4 * 96 + 10}" y="62" class="sub">Median of ${r.runs} runs · ${esc(cpu)} · bold = fastest</text>
${legend}
${body}
</g>
</svg>
`;
}

function table(r, metric, title) {
  let md = `| ${title} | ${FRAMEWORKS.join(' | ')} |\n|---|${FRAMEWORKS.map(() => '---:').join('|')}|\n`;
  for (const key of OPS) {
    const cells = FRAMEWORKS.map((f) => r.frameworks[f].operations[key][metric]);
    const best = Math.min(...cells.map((c) => c.median));
    md += `| ${r.frameworks.React.operations[key].label} | ${cells
      .map((c) => {
        const text = metric === 'busy' ? `${c.median.toFixed(1)} ± ${c.sd.toFixed(1)}` : c.median.toFixed(1);
        return c.median === best ? `**${text}**` : text;
      })
      .join(' | ')} |\n`;
  }
  return md;
}

function styleLayoutTable(r) {
  let md = `| Style + layout (ms) | ${FRAMEWORKS.join(' | ')} |\n|---|${FRAMEWORKS.map(() => '---:').join('|')}|\n`;
  for (const key of OPS) {
    md += `| ${r.frameworks.React.operations[key].label} | ${FRAMEWORKS.map((f) => {
      const o = r.frameworks[f].operations[key];
      return (o.style.median + o.layout.median).toFixed(1);
    }).join(' | ')} |\n`;
  }
  return md;
}

function memoryTable(r) {
  const row = (label, fn) => `| ${label} | ${FRAMEWORKS.map((f) => fn(r.frameworks[f])).join(' | ')} |\n`;
  return (
    `| Memory and size | ${FRAMEWORKS.join(' | ')} |\n|---|${FRAMEWORKS.map(() => '---:').join('|')}|\n` +
    row('JS heap, empty list (MB)', (f) => f.memory.heapEmptyMB.toFixed(2)) +
    row('JS heap, 1000 tasks (MB)', (f) => f.memory.heap1000MB.toFixed(2)) +
    row('DOM nodes, 1000 tasks', (f) => f.memory.domNodes1000) +
    row('JS bundle (KB, gzip)', (f) => f.bundle.jsGzipKB.toFixed(1))
  );
}

let md = `# Benchmark results\n\nMade by \`npm run chart\` from the JSON files in this folder. All times are in milliseconds, median of the runs, **bold = fastest**.\n\n- **Main-thread time** (± standard deviation) is how long Chrome's main thread was busy with the operation: the framework's JavaScript, style, layout and paint (Chrome DevTools' \`TaskDuration\` counter). This is the main result.\n- **Time to paint** is from the click until the result is on screen. It's closer to what a user feels, but it moves by up to ~16 ms depending on when the click lands in the screen's refresh cycle, so it's noisier.\n`;
for (const r of all) {
  const name = `chart-cpu${r.cpuSlowdown}x.svg`;
  writeFileSync(join(dir, name), svgChart(r));
  const cpu = r.cpuSlowdown > 1 ? `CPU slowed down ${r.cpuSlowdown}×` : 'Normal CPU speed';
  md += `\n## ${cpu}\n\n${r.chrome}, ${r.runs} runs per operation, ${r.date.slice(0, 10)}.\n\n![Chart](${name})\n\n`;
  md += table(r, 'busy', 'Main-thread time (ms)') + '\n';
  md += table(r, 'total', 'Time to paint (ms)') + '\n';
  md += styleLayoutTable(r) + '\n';
  md += memoryTable(r);
}
writeFileSync(join(dir, 'RESULTS.md'), md);
console.log(`Wrote RESULTS.md and ${all.length} chart(s) in ${dir}`);
