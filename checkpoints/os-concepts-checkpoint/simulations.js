// Simulations for the OS checkpoint: CPU scheduling, a race condition,
// page replacement and disk scheduling. Every number in the report comes from here.
// Run with: node simulations.js

// ===================== Part 1: CPU scheduling =====================

export const PROCESSES = [
  { id: 'P1', arrival: 0, burst: 5 },
  { id: 'P2', arrival: 1, burst: 3 },
  { id: 'P3', arrival: 2, burst: 1 },
];

/** Adds completion, turnaround, waiting and response time to each process */
function summarise(processes, gantt) {
  const rows = processes.map((p) => {
    const slices = gantt.filter((s) => s.id === p.id);
    const completion = slices.at(-1).end;
    const firstStart = slices[0].start;
    const turnaround = completion - p.arrival;
    return {
      ...p,
      completion,
      turnaround,
      waiting: turnaround - p.burst,
      response: firstStart - p.arrival,
    };
  });
  const avg = (key) => rows.reduce((sum, r) => sum + r[key], 0) / rows.length;
  return { gantt, rows, avgWaiting: avg('waiting'), avgTurnaround: avg('turnaround'), avgResponse: avg('response') };
}

/** First Come First Served: run each process to the end, in arrival order */
export function fcfs(processes) {
  const gantt = [];
  let time = 0;
  for (const p of [...processes].sort((a, b) => a.arrival - b.arrival)) {
    if (time < p.arrival) {
      gantt.push({ id: 'idle', start: time, end: p.arrival });
      time = p.arrival;
    }
    gantt.push({ id: p.id, start: time, end: time + p.burst });
    time += p.burst;
  }
  return summarise(processes, gantt);
}

/**
 * Round Robin. Convention used: when a process arrives at the same moment another
 * one's quantum ends, the new arrival joins the ready queue first, then the
 * preempted process goes to the back (the usual textbook convention).
 */
export function roundRobin(processes, quantum) {
  const pending = [...processes].sort((a, b) => a.arrival - b.arrival).map((p) => ({ ...p, remaining: p.burst }));
  const queue = [];
  const gantt = [];
  const queueLog = [];
  let time = 0;

  const admitArrivals = () => {
    while (pending.length && pending[0].arrival <= time) queue.push(pending.shift());
  };

  admitArrivals();
  while (queue.length || pending.length) {
    if (!queue.length) {
      gantt.push({ id: 'idle', start: time, end: pending[0].arrival });
      time = pending[0].arrival;
      admitArrivals();
      continue;
    }
    const current = queue.shift();
    const run = Math.min(quantum, current.remaining);
    gantt.push({ id: current.id, start: time, end: time + run });
    time += run;
    current.remaining -= run;
    admitArrivals(); // arrivals first...
    if (current.remaining > 0) queue.push(current); // ...then the preempted process
    queueLog.push({ time, queue: queue.map((p) => `${p.id}(${p.remaining})`) });
  }

  // merge back-to-back slices of the same process for the chart
  const merged = gantt.reduce((acc, s) => {
    const last = acc.at(-1);
    if (last && last.id === s.id && last.end === s.start) last.end = s.end;
    else acc.push({ ...s });
    return acc;
  }, []);
  return { ...summarise(processes, merged), queueLog };
}

// ===================== Part 2: race condition =====================

/**
 * counter++ is really three machine steps: LOAD, ADD, STORE.
 * This replays one bad interleaving of P1 and P2 to show an update being lost.
 */
export function lostUpdateTrace() {
  let counter = 0;
  const reg = { P1: 0, P2: 0 };
  const steps = [
    ['P1', 'LOAD', () => (reg.P1 = counter)],
    ['P2', 'LOAD', () => (reg.P2 = counter)],
    ['P1', 'ADD', () => (reg.P1 += 1)],
    ['P2', 'ADD', () => (reg.P2 += 1)],
    ['P1', 'STORE', () => (counter = reg.P1)],
    ['P2', 'STORE', () => (counter = reg.P2)],
  ];
  return steps.map(([process, op, action]) => {
    action();
    const register = reg[process];
    return { process, op: `${op} ${op === 'LOAD' ? 'counter → reg' : op === 'ADD' ? 'reg + 1' : 'reg → counter'}`, register, counter };
  });
}

/** Runs P1 and P2 (100 increments each) with a random interleaving, with or without a lock */
export function runCounter({ useLock, seed = 1 }) {
  let rand = seed;
  const random = () => ((rand = (rand * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

  let counter = 0;
  let lockOwner = null;
  const procs = ['P1', 'P2'].map((id) => ({ id, done: 0, step: 0, reg: 0 }));

  while (procs.some((p) => p.done < 100)) {
    const p = procs.filter((x) => x.done < 100)[Math.floor(random() * procs.filter((x) => x.done < 100).length)];
    if (useLock && p.step === 0) {
      if (lockOwner && lockOwner !== p.id) continue; // blocked: wait for the lock
      lockOwner = p.id; // acquire
    }
    if (p.step === 0) p.reg = counter; // LOAD
    else if (p.step === 1) p.reg += 1; // ADD
    else counter = p.reg; // STORE
    p.step = (p.step + 1) % 3;
    if (p.step === 0) {
      p.done++;
      if (useLock) lockOwner = null; // release
    }
  }
  return counter;
}

// ===================== Part 3: page replacement =====================

export const REFERENCE_STRING = [1, 2, 3, 2, 4, 1, 5];
export const FRAMES = 3;

/** chooseVictim(frames, history, index) returns the page to evict */
function simulatePaging(refs, frameCount, chooseVictim) {
  const frames = [];
  const loadedAt = new Map();
  const lastUsed = new Map();
  const steps = [];
  let faults = 0;

  refs.forEach((page, i) => {
    let fault = false;
    let evicted = null;
    if (!frames.includes(page)) {
      fault = true;
      faults++;
      if (frames.length < frameCount) {
        frames.push(page);
      } else {
        evicted = chooseVictim(frames, { loadedAt, lastUsed, refs, i });
        frames[frames.indexOf(evicted)] = page;
      }
      loadedAt.set(page, i);
    }
    lastUsed.set(page, i);
    steps.push({ page, frames: [...frames], fault, evicted });
  });
  return { steps, faults, hits: refs.length - faults };
}

export const fifo = (refs, n) =>
  simulatePaging(refs, n, (frames, { loadedAt }) => frames.reduce((a, b) => (loadedAt.get(a) <= loadedAt.get(b) ? a : b)));

export const lru = (refs, n) =>
  simulatePaging(refs, n, (frames, { lastUsed }) => frames.reduce((a, b) => (lastUsed.get(a) <= lastUsed.get(b) ? a : b)));

/** Optimal (Belady): evict the page used furthest in the future. Shown only as a comparison. */
export const optimal = (refs, n) =>
  simulatePaging(refs, n, (frames, { i }) => {
    const nextUse = (page) => {
      const idx = refs.indexOf(page, i + 1);
      return idx === -1 ? Infinity : idx;
    };
    return frames.reduce((a, b) => (nextUse(a) >= nextUse(b) ? a : b));
  });

// ===================== Part 4: disk scheduling =====================

export const HEAD_START = 53;
export const REQUESTS = [98, 183, 37, 122, 14, 124, 65, 67];

function moves(start, order) {
  let head = start;
  return order.map((track) => {
    const distance = Math.abs(track - head);
    const step = { from: head, to: track, distance };
    head = track;
    return step;
  });
}

const total = (steps) => steps.reduce((sum, s) => sum + s.distance, 0);

export function diskFcfs(start, requests) {
  const steps = moves(start, requests);
  return { order: [...requests], steps, total: total(steps) };
}

/** Shortest Seek Time First: always go to the closest pending request */
export function diskSstf(start, requests) {
  const pending = [...requests];
  const order = [];
  let head = start;
  while (pending.length) {
    const closest = pending.reduce((a, b) => (Math.abs(a - head) <= Math.abs(b - head) ? a : b));
    order.push(closest);
    pending.splice(pending.indexOf(closest), 1);
    head = closest;
  }
  const steps = moves(start, order);
  return { order, steps, total: total(steps) };
}

// ===================== Print everything =====================

function printAll() {
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  const ganttLine = (g) => g.map((s) => `| ${s.id} (${s.start}-${s.end}) `).join('') + '|';

  console.log('=== Part 1: CPU scheduling ===');
  for (const [name, result] of [['FCFS', fcfs(PROCESSES)], ['Round Robin (q=2)', roundRobin(PROCESSES, 2)]]) {
    console.log(`\n${name}\n  ${ganttLine(result.gantt)}`);
    console.table(result.rows.map(({ id, arrival, burst, completion, turnaround, waiting, response }) => ({ id, arrival, burst, completion, turnaround, waiting, response })));
    console.log(`  average waiting = ${fmt(result.avgWaiting)}, average response = ${fmt(result.avgResponse)}, average turnaround = ${fmt(result.avgTurnaround)}`);
  }

  console.log('\n=== Part 2: race condition ===');
  console.table(lostUpdateTrace());
  const unsafe = [1, 2, 3, 4, 5].map((seed) => runCounter({ useLock: false, seed }));
  const safe = [1, 2, 3, 4, 5].map((seed) => runCounter({ useLock: true, seed }));
  console.log(`  without a lock (5 runs): ${unsafe.join(', ')}`);
  console.log(`  with a mutex   (5 runs): ${safe.join(', ')}`);

  console.log('\n=== Part 3: page replacement (3 frames) ===');
  for (const [name, result] of [['FIFO', fifo(REFERENCE_STRING, FRAMES)], ['LRU', lru(REFERENCE_STRING, FRAMES)], ['Optimal', optimal(REFERENCE_STRING, FRAMES)]]) {
    console.log(`\n${name}: ${result.faults} faults, ${result.hits} hit(s)`);
    result.steps.forEach((s) =>
      console.log(`  ref ${s.page}: [${s.frames.join(', ').padEnd(7)}] ${s.fault ? 'FAULT' : 'hit'}${s.evicted ? ` (evicted ${s.evicted})` : ''}`)
    );
  }

  console.log('\n=== Part 4: disk scheduling (head at 53) ===');
  for (const [name, result] of [['FCFS', diskFcfs(HEAD_START, REQUESTS)], ['SSTF', diskSstf(HEAD_START, REQUESTS)]]) {
    console.log(`\n${name}: ${[HEAD_START, ...result.order].join(' → ')}`);
    console.log(`  ${result.steps.map((s) => s.distance).join(' + ')} = ${result.total} tracks`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) printAll();
