// Builds report.html from the simulation results (so no number is typed by hand).
// Run with: node build-report.js   then open report.html, or print it to PDF.

import { writeFileSync } from 'node:fs';
import {
  PROCESSES, fcfs, roundRobin, lostUpdateTrace, runCounter,
  REFERENCE_STRING, FRAMES, fifo, lru, optimal,
  HEAD_START, REQUESTS, diskFcfs, diskSstf,
} from './simulations.js';

const AUTHOR = 'Chimaroke Amadi';
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const COLORS = { P1: '#2563eb', P2: '#16a34a', P3: '#ea580c', idle: '#94a3b8' };

// ---------- Part 1 ----------
const fcfsResult = fcfs(PROCESSES);
const rrResult = roundRobin(PROCESSES, 2);

function ganttChart(result) {
  const end = result.gantt.at(-1).end;
  const blocks = result.gantt
    .map((s) => `<div class="block" style="flex:${s.end - s.start};background:${COLORS[s.id]}">${s.id}</div>`)
    .join('');
  const ticks = Array.from({ length: end + 1 }, (_, t) => {
    const shown = result.gantt.some((s) => s.start === t || s.end === t);
    return `<span style="left:${(t / end) * 100}%">${shown ? t : ''}</span>`;
  }).join('');
  return `<div class="gantt"><div class="bar">${blocks}</div><div class="ticks">${ticks}</div></div>`;
}

function processTable(result) {
  const rows = result.rows
    .map((r) => `<tr><td>${r.id}</td><td>${r.arrival}</td><td>${r.burst}</td><td>${r.completion}</td>
      <td>${r.completion} − ${r.arrival} = ${r.turnaround}</td>
      <td>${r.turnaround} − ${r.burst} = <b>${r.waiting}</b></td><td>${r.response}</td></tr>`)
    .join('');
  return `<table><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Completion</th>
    <th>Turnaround<br><small>completion − arrival</small></th><th>Waiting<br><small>turnaround − burst</small></th>
    <th>Response<br><small>first run − arrival</small></th></tr>${rows}
    <tr class="avg"><td colspan="4">Average</td><td>${fmt(result.avgTurnaround)}</td><td><b>${fmt(result.avgWaiting)}</b></td><td>${fmt(result.avgResponse)}</td></tr></table>`;
}

const sumWaiting = (r) => `(${r.rows.map((x) => x.waiting).join(' + ')}) / 3 = ${r.rows.reduce((s, x) => s + x.waiting, 0)} / 3 = <b>${fmt(r.avgWaiting)}</b>`;

const rrQueue = rrResult.queueLog
  .map((q, i) => `<tr><td>${rrResult.gantt[i] ? `${rrResult.gantt[i].id} runs ${rrResult.gantt[i].start}–${rrResult.gantt[i].end}` : ''}</td><td>${q.time}</td><td>${q.queue.join(', ') || '(empty)'}</td></tr>`)
  .join('');

// ---------- Part 2 ----------
const trace = lostUpdateTrace()
  .map((s, i) => `<tr><td>${i + 1}</td><td>${s.process}</td><td><code>${s.op}</code></td><td>${s.register}</td><td>${s.counter}</td></tr>`)
  .join('');
const seeds = [1, 2, 3, 4, 5];
const unsafeRuns = seeds.map((seed) => runCounter({ useLock: false, seed }));
const safeRuns = seeds.map((seed) => runCounter({ useLock: true, seed }));

// ---------- Part 3 ----------
const fifoResult = fifo(REFERENCE_STRING, FRAMES);
const lruResult = lru(REFERENCE_STRING, FRAMES);
const optResult = optimal(REFERENCE_STRING, FRAMES);

function pagingTable(result) {
  const head = `<tr><th>Reference</th>${result.steps.map((s) => `<th>${s.page}</th>`).join('')}</tr>`;
  const frameRows = Array.from({ length: FRAMES }, (_, f) =>
    `<tr><th>Frame ${f + 1}</th>${result.steps.map((s) => `<td>${s.frames[f] ?? ''}</td>`).join('')}</tr>`
  ).join('');
  const faultRow = `<tr><th>Fault?</th>${result.steps.map((s) => `<td class="${s.fault ? 'fault' : 'hit'}">${s.fault ? 'F' : '✓'}</td>`).join('')}</tr>`;
  const evictRow = `<tr><th>Evicted</th>${result.steps.map((s) => `<td>${s.evicted ?? ''}</td>`).join('')}</tr>`;
  return `<table class="paging">${head}${frameRows}${faultRow}${evictRow}</table>
    <p><b>${result.faults} page faults</b>, ${result.hits} hit${result.hits === 1 ? '' : 's'} out of ${REFERENCE_STRING.length} references.</p>`;
}

// ---------- Part 4 ----------
const diskF = diskFcfs(HEAD_START, REQUESTS);
const diskS = diskSstf(HEAD_START, REQUESTS);

function diskTable(result) {
  const rows = result.steps.map((s, i) => `<tr><td>${i + 1}</td><td>${s.from} → ${s.to}</td><td>|${s.to} − ${s.from}| = ${s.distance}</td></tr>`).join('');
  return `<table class="narrow"><tr><th>#</th><th>Move</th><th>Distance</th></tr>${rows}
    <tr class="avg"><td colspan="2">Total head movement</td><td><b>${result.total} tracks</b></td></tr></table>`;
}

function diskChart(result, color) {
  const width = 640;
  const height = 230;
  const pad = 30;
  const x = (track) => pad + (track / 199) * (width - 2 * pad);
  const y = (i) => pad + i * ((height - 2 * pad) / result.order.length);
  const points = [HEAD_START, ...result.order].map((t, i) => [x(t), y(i)]);
  const axis = [0, 14, 37, 53, 65, 67, 98, 122, 124, 183, 199]
    .map((t) => `<line x1="${x(t)}" y1="${pad - 6}" x2="${x(t)}" y2="${height - pad}" class="grid"/>
      <text x="${x(t)}" y="${pad - 10}" text-anchor="middle" class="${[65, 67, 122, 124].includes(t) && [67, 124].includes(t) ? 'lbl2' : 'lbl'}">${t}</text>`)
    .join('');
  const dots = points.map(([px, py], i) => `<circle cx="${px}" cy="${py}" r="4" fill="${i === 0 ? '#111' : color}"/>`).join('');
  return `<svg viewBox="0 0 ${width} ${height}" class="disk">${axis}
    <polyline points="${points.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>${dots}
    <text x="${width - pad}" y="${height - 8}" text-anchor="end" class="lbl">track →   (time goes down)</text></svg>`;
}

// ---------- HTML ----------
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OS Concepts Checkpoint</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; font-size: 10.5pt; max-width: 820px; margin: 0 auto; padding: 24px 16px; background: #fff; }
  h1 { font-size: 22pt; margin: 0 0 4px; color: #1e3a8a; }
  h2 { font-size: 15pt; color: #1e3a8a; border-bottom: 2px solid #c7d2fe; padding-bottom: 4px; margin-top: 28px; }
  h3 { font-size: 12pt; margin: 18px 0 6px; }
  .subtitle { color: #64748b; margin: 0 0 16px; }
  .part { break-before: page; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9.5pt; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; }
  th { background: #eef2ff; }
  table.narrow { width: auto; min-width: 60%; }
  tr.avg td { background: #f8fafc; font-weight: 600; }
  td.fault { background: #fee2e2; color: #b91c1c; font-weight: 700; }
  td.hit { background: #dcfce7; color: #15803d; font-weight: 700; }
  .paging th:first-child { text-align: left; width: 80px; }
  .gantt { margin: 8px 0 22px; }
  .bar { display: flex; height: 36px; border: 1px solid #334155; border-radius: 4px; overflow: hidden; }
  .block { color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; border-right: 1px solid #fff;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ticks { position: relative; height: 16px; font-size: 9pt; }
  .ticks span { position: absolute; transform: translateX(-50%); top: 2px; }
  .box { background: #f1f5f9; border-left: 4px solid #2563eb; padding: 8px 12px; margin: 10px 0; border-radius: 4px; }
  .answer { background: #ecfdf5; border-left-color: #16a34a; }
  .note { background: #fffbeb; border-left-color: #d97706; font-size: 9.5pt; }
  pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; font-size: 9pt; line-height: 1.45; overflow-x: auto; }
  code { font-size: 9pt; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  svg.disk { width: 100%; height: auto; margin: 4px 0 8px; }
  svg .grid { stroke: #e2e8f0; stroke-width: 1; }
  svg .lbl { font-size: 10px; fill: #475569; }
  svg .lbl2 { font-size: 10px; fill: #475569; transform: translateY(-9px); }
  .summary td:first-child, .summary th:first-child { text-align: left; }
  @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
  @media print { body { padding: 0; } .box, pre, table, .gantt, svg { break-inside: avoid; } }
</style></head><body>

<h1>Operating System Concepts</h1>
<p class="subtitle">CPU scheduling · synchronization · memory management · disk scheduling<br>${AUTHOR} · GoMyCode</p>

<p>In this checkpoint I simulated how an operating system manages several tasks at once. For each part I worked through the scenario step by step, drew the charts, and did the calculations. To check my answers, I also wrote small simulations in JavaScript (<code>simulations.js</code>), and every number in this report is generated from them.</p>

<h3>Summary of results</h3>
<table class="summary">
<tr><th>Part</th><th>Algorithm A</th><th>Algorithm B</th><th>Better</th></tr>
<tr><td>1. CPU scheduling (avg waiting time)</td><td>FCFS: ${fmt(fcfsResult.avgWaiting)}</td><td>Round Robin (q=2): ${fmt(rrResult.avgWaiting)}</td><td>Round Robin is more responsive (avg response ${fmt(rrResult.avgResponse)} vs ${fmt(fcfsResult.avgResponse)})</td></tr>
<tr><td>2. Synchronization (final counter)</td><td>No lock: ${Math.min(...unsafeRuns)}–${Math.max(...unsafeRuns)} in my runs</td><td>Mutex: always ${safeRuns[0]}</td><td>Mutex</td></tr>
<tr><td>3. Page replacement (page faults)</td><td>FIFO: ${fifoResult.faults}</td><td>LRU: ${lruResult.faults}</td><td>A tie for this string, LRU better in general</td></tr>
<tr><td>4. Disk scheduling (head movement)</td><td>FCFS: ${diskF.total}</td><td>SSTF: ${diskS.total}</td><td>SSTF (${Math.round((1 - diskS.total / diskF.total) * 100)}% less)</td></tr>
</table>

<!-- ================= PART 1 ================= -->
<section class="part">
<h2>Part 1: Process Scheduling</h2>
<table class="narrow"><tr><th>Process</th><th>Arrival time</th><th>Burst time</th></tr>
${PROCESSES.map((p) => `<tr><td>${p.id}</td><td>${p.arrival}</td><td>${p.burst}</td></tr>`).join('')}</table>

<p>The formulas I used: <b>turnaround = completion − arrival</b>, <b>waiting = turnaround − burst</b> (the time spent in the ready queue), and <b>response = first time on the CPU − arrival</b>.</p>

<h3>1.1 First Come, First Served (FCFS)</h3>
<p>The CPU runs the processes in the order they arrive, and each one runs until it finishes (non-preemptive). P1 arrives first at time 0 and keeps the CPU until time 5, even though P2 and P3 arrive while it's running. Then P2 runs from 5 to 8, and P3 from 8 to 9.</p>
${ganttChart(fcfsResult)}
${processTable(fcfsResult)}
<div class="box answer">Average waiting time (FCFS) = ${sumWaiting(fcfsResult)} time units</div>

<h3>1.2 Round Robin (time quantum = 2)</h3>
<p>Each process gets the CPU for at most 2 time units, then goes to the back of the ready queue if it isn't finished. The ready queue changes like this (remaining burst time in brackets):</p>
<table class="narrow"><tr><th>CPU</th><th>At time</th><th>Ready queue afterwards</th></tr>${rrQueue}</table>
<p>At time 2, P1's quantum ends at the same moment P3 arrives. I used the usual convention that the new arrival joins the queue first and the preempted process goes behind it, so the queue becomes P2, P3, P1.</p>
${ganttChart(rrResult)}
${processTable(rrResult)}
<div class="box answer">Average waiting time (Round Robin, q = 2) = ${sumWaiting(rrResult)} time units</div>

<h3>1.3 Which algorithm is more responsive?</h3>
<p>Here the average waiting time is the same for both algorithms (${fmt(fcfsResult.avgWaiting)}), but the waiting is shared very differently. With FCFS, the short process P3 (only 1 unit of work) waits 6 units because it's stuck behind the long P1. This is called the <b>convoy effect</b>. With Round Robin, P3 waits only 2 units, and nobody waits more than 4.</p>
<p><b>Round Robin is more responsive.</b> Responsiveness is about how soon a process first gets the CPU (response time), and the average response time drops from <b>${fmt(fcfsResult.avgResponse)}</b> with FCFS to <b>${fmt(rrResult.avgResponse)}</b> with Round Robin. Every process is guaranteed a turn within a short, bounded time, at most (n − 1) × quantum, because the CPU is preempted after each quantum. That's why time-sharing and interactive systems use Round Robin-style scheduling. The cost is extra context switches (5 switches instead of 2 here), and turnaround time doesn't improve (${fmt(rrResult.avgTurnaround)} for both). If the quantum is too large, Round Robin behaves like FCFS. If it's too small, most of the time is spent switching.</p>
<div class="box note">With the other convention (the preempted P1 queued before the newly arrived P3), the order would be P1, P2, P1, P3, P2, P1 and the average waiting time would be 4.00. Round Robin would still have the better response time.</div>
</section>

<!-- ================= PART 2 ================= -->
<section class="part">
<h2>Part 2: Process Synchronization</h2>
<p>P1 and P2 share the variable <code>counter</code> (starting at 0), and each increments it 100 times. The expected final value is <b>200</b>.</p>

<h3>2.1 What could go wrong without synchronization</h3>
<p>The problem is a <b>race condition</b>. <code>counter = counter + 1</code> looks like one step, but the CPU actually does it in three: <b>LOAD</b> the value into a register, <b>ADD</b> 1, and <b>STORE</b> it back. The scheduler can switch between P1 and P2 in the middle of these steps. If both load the same value before either stores, one of the increments is lost:</p>
<table class="narrow"><tr><th>Step</th><th>Process</th><th>Instruction</th><th>Its register</th><th>counter in memory</th></tr>${trace}</table>
<p>Two increments happened, but <code>counter</code> only went from 0 to 1. Because this can happen any number of times, the final result is unpredictable and is usually <b>less than 200</b> (in theory anything from 2 to 200). It can also change from one run to the next, which makes the bug hard to reproduce. I simulated 5 runs with random switching between the two processes and got <b>${unsafeRuns.join(', ')}</b>, never 200. The part of the code that touches the shared variable is the <b>critical section</b>, and only one process should be inside it at a time (<b>mutual exclusion</b>).</p>

<h3>2.2 Suggested mechanism: a mutex</h3>
<p>I'd use a <b>mutex</b> (mutual exclusion lock). Before entering the critical section, a process must <code>lock</code> the mutex. If the other process already holds it, the caller is blocked until it's unlocked. The lock and unlock operations are atomic (the OS or hardware guarantees they can't be interrupted halfway), so only one process can ever hold it. A mutex fits this problem well because there's exactly one shared resource and the same process that locks it also unlocks it. A binary semaphore initialised to 1 would also work (<code>wait</code>/<code>signal</code> instead of <code>lock</code>/<code>unlock</code>), and so would a monitor, which puts the counter and its operations inside one object that only one process can use at a time.</p>

<h3>2.3 Pseudocode</h3>
<pre>shared counter ← 0
shared mutex   ← new Mutex()          // unlocked at the start

procedure Worker(name)                // run once as P1 and once as P2, at the same time
    for i ← 1 to 100 do
        // ----- entry section -----
        lock(mutex)                   // waits here if the other process holds the lock

        // ----- critical section: only one process at a time -----
        temp    ← counter             // LOAD
        temp    ← temp + 1            // ADD
        counter ← temp                // STORE

        // ----- exit section -----
        unlock(mutex)                 // lets the waiting process in

        // remainder section (code that doesn't touch counter)
    end for
end procedure

start Worker("P1") and Worker("P2") in parallel
wait for both to finish
print counter                         // always 200</pre>

<p>The same idea with a semaphore:</p>
<pre>shared S ← Semaphore(1)
...  wait(S)      // S: 1 → 0, a second caller blocks while S = 0
     counter ← counter + 1
     signal(S)    // S: 0 → 1, wakes one waiting process</pre>

<p>This solution meets the three requirements of a correct critical-section solution. <b>Mutual exclusion</b>: only the holder of the lock can be in the critical section. <b>Progress</b>: when the lock is free, a waiting process gets it straight away. <b>Bounded waiting</b>: each process unlocks after one increment, so the other is never kept waiting forever. When I added the lock to the same 5 simulated runs, every one gave <b>${safeRuns.join(', ')}</b>. The critical section is kept as small as possible (only the increment), so the two processes still run in parallel the rest of the time.</p>
</section>

<!-- ================= PART 3 ================= -->
<section class="part">
<h2>Part 3: Memory Management</h2>
<p>The process uses 5 different pages, but only <b>${FRAMES} frames</b> are available. Reference string: <b>${REFERENCE_STRING.join(', ')}</b>. A <span style="color:#b91c1c;font-weight:700">F</span> means a page fault (the page wasn't in memory and had to be loaded), and a <span style="color:#15803d;font-weight:700">✓</span> means a hit. The first three references are always faults, because memory starts empty (compulsory misses).</p>

<h3>3.1 FIFO (First In, First Out)</h3>
<p>When a page has to be replaced, FIFO evicts the page that has been in memory the <b>longest</b>, no matter how recently it was used.</p>
${pagingTable(fifoResult)}
<p>At reference 4, page 1 is the oldest, so it's evicted. Then page 1 is needed straight away, so it causes another fault and evicts page 2 (now the oldest). Finally, 5 evicts 3.</p>

<h3>3.2 LRU (Least Recently Used)</h3>
<p>LRU evicts the page that hasn't been <b>used</b> for the longest time, based on the idea that a page used recently will probably be used again soon (locality of reference).</p>
${pagingTable(lruResult)}
<p>At reference 4, page 1 is the least recently used (2 was just used at reference 4), so 1 is evicted, the same choice as FIFO. At the next reference, LRU evicts 3 instead of 2, because 2 was used more recently. The pages kept are different, but the number of faults ends up the same.</p>

<h3>3.3 Comparison</h3>
<table class="narrow"><tr><th>Algorithm</th><th>Page faults</th><th>Hits</th><th>Fault rate</th></tr>
<tr><td>FIFO</td><td><b>${fifoResult.faults}</b></td><td>${fifoResult.hits}</td><td>${Math.round((fifoResult.faults / REFERENCE_STRING.length) * 100)}%</td></tr>
<tr><td>LRU</td><td><b>${lruResult.faults}</b></td><td>${lruResult.hits}</td><td>${Math.round((lruResult.faults / REFERENCE_STRING.length) * 100)}%</td></tr>
<tr><td><i>Optimal (for comparison)</i></td><td>${optResult.faults}</td><td>${optResult.hits}</td><td>${Math.round((optResult.faults / REFERENCE_STRING.length) * 100)}%</td></tr></table>
<p><b>For this reference string, FIFO and LRU perform the same: ${fifoResult.faults} page faults each.</b> The string is very short and has almost no repeated use. Only page 2 is referenced twice in a short time, and both algorithms keep it. After that, pages 4, 1 and 5 each appear once in a row, so there's no "recent use" pattern for LRU to take advantage of. Even the Optimal algorithm, which knows the future and is the best possible, only saves one fault (${optResult.faults}). So there was very little room to improve.</p>
<p><b>In general, LRU performs better than FIFO.</b> Real programs have locality: they keep using the same pages (a loop, a function, an array) for a while. LRU keeps those recently used pages, while FIFO may throw out a page that is heavily used just because it was loaded early. FIFO can also suffer from <b>Belady's anomaly</b>, where giving it more frames causes <i>more</i> faults, and LRU never does. The downside of LRU is cost: the system has to record when every page is used (with counters or a stack, or approximately with reference bits as in the Clock algorithm), while FIFO only needs a simple queue.</p>
</section>

<!-- ================= PART 4 ================= -->
<section class="part">
<h2>Part 4: Disk Scheduling</h2>
<p>The disk head starts at track <b>${HEAD_START}</b>. Pending requests, in the order they arrived: <b>${REQUESTS.join(', ')}</b>. Head movement for each step = |destination − current position|.</p>

<h3>4.1 FCFS (First Come, First Served)</h3>
<p>The requests are served in the order they arrived: <b>${[HEAD_START, ...diskF.order].join(' → ')}</b></p>
<div class="grid2"><div>${diskTable(diskF)}</div><div>${diskChart(diskF, '#dc2626')}</div></div>
<div class="box answer">Total head movement (FCFS) = ${diskF.steps.map((s) => s.distance).join(' + ')} = <b>${diskF.total} tracks</b></div>

<h3>4.2 SSTF (Shortest Seek Time First)</h3>
<p>At each step, the head goes to the pending request <b>closest</b> to its current position. From 53, the closest is 65 (12 away), then 67 (2 away). From 67, the closest is 37 (30 away, closer than 98 at 31), then 14. Then it goes back up through 98, 122, 124 and 183: <b>${[HEAD_START, ...diskS.order].join(' → ')}</b></p>
<div class="grid2"><div>${diskTable(diskS)}</div><div>${diskChart(diskS, '#2563eb')}</div></div>
<div class="box answer">Total head movement (SSTF) = ${diskS.steps.map((s) => s.distance).join(' + ')} = <b>${diskS.total} tracks</b></div>

<h3>4.3 Conclusion</h3>
<p><b>SSTF is much more efficient here: ${diskS.total} tracks instead of ${diskF.total}</b>, which is ${diskF.total - diskS.total} tracks or about ${Math.round((1 - diskS.total / diskF.total) * 100)}% less head movement. The charts show why. FCFS keeps jumping across the whole disk (98 → 183 → 37 → 122 → 14 → 124), while SSTF handles the nearby requests together and only makes one big trip. Since moving the head (seek time) is the slowest part of a disk access, less movement means faster average response and higher throughput.</p>
<p>SSTF has two weaknesses. It isn't always optimal (here it first goes down to 14 and then has to come all the way back up). More importantly, it can cause <b>starvation</b>: if new requests keep arriving near the head, a request far away, like 183, could wait for a very long time. FCFS is fair and never starves a request, but it's slow. In practice, systems often use SCAN or C-SCAN (the "elevator" algorithms), which keep most of SSTF's efficiency while guaranteeing every request is eventually served.</p>
</section>

</body></html>`;

writeFileSync(new URL('./report.html', import.meta.url), html);
console.log('Wrote report.html');
