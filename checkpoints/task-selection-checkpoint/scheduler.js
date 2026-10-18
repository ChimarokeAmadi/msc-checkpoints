// Select the maximum number of non-overlapping delivery tasks for one driver.
// A task ending at time t and a task starting at time t do NOT overlap.

// ---------- Brute force ----------

// Tries every combination of tasks: for each task, either take it or skip it.
// A task can only be taken if it starts after the last taken task ends,
// so invalid combinations are dropped as soon as they appear.
// Time O(2^n) in the worst case, Space O(n) for the recursion and current pick.
//
// timeLimitMs stops the search if it runs too long (throws "time limit").
function bruteForce(tasks, timeLimitMs = Infinity) {
	const sorted = [...tasks].sort((a, b) => a.start - b.start);
	const deadline = performance.now() + timeLimitMs;
	let best = [];
	const current = [];
	let steps = 0;

	function explore(index, lastEnd) {
		// Check the clock every 100,000 steps so the check itself stays cheap
		if (++steps % 100000 === 0 && performance.now() > deadline) {
			throw new Error("time limit");
		}

		if (index === sorted.length) {
			if (current.length > best.length) {
				best = [...current];
			}
			return;
		}

		const task = sorted[index];

		// Option 1: take this task (only if it doesn't overlap the last one taken)
		if (task.start >= lastEnd) {
			current.push(task);
			explore(index + 1, task.end);
			current.pop();
		}

		// Option 2: skip this task
		explore(index + 1, lastEnd);
	}

	explore(0, -Infinity);
	return best;
}

// ---------- Greedy ----------

// Always take the task that ends earliest among those that still fit.
// Ending early leaves the most time free for the remaining tasks.
// Time O(n log n) for the sort + O(n) for the scan, Space O(n) for the sorted copy.
function greedy(tasks) {
	const sorted = [...tasks].sort((a, b) => a.end - b.end);
	const selected = [];
	let lastEnd = -Infinity;

	for (const task of sorted) {
		if (task.start >= lastEnd) {
			selected.push(task);
			lastEnd = task.end;
		}
	}

	return selected;
}

// ---------- Helpers ----------

function isValidSchedule(selected) {
	const sorted = [...selected].sort((a, b) => a.start - b.start);
	return sorted.every((task, i) => i === 0 || sorted[i - 1].end <= task.start);
}

function formatTasks(selected) {
	return selected.map((t) => `[${t.start}-${t.end}]`).join(" ");
}

function randomTasks(count, maxTime, maxLength) {
	const tasks = [];
	for (let i = 0; i < count; i++) {
		const start = Math.floor(Math.random() * maxTime);
		const length = 1 + Math.floor(Math.random() * maxLength);
		tasks.push({ start, end: start + length });
	}
	return tasks;
}

function time(fn) {
	const t = performance.now();
	const result = fn();
	return { result, ms: performance.now() - t };
}

// Runs brute force and reports a failure as text instead of crashing:
// either it runs out of time, or the recursion (one level per task)
// overflows the call stack on large inputs.
function tryBruteForce(input, timeLimitMs = 5000) {
	const t = performance.now();
	try {
		const result = bruteForce(input, timeLimitMs);
		const ms = performance.now() - t;
		return { result, ms, text: `${result.length} tasks in ${ms.toFixed(2)} ms` };
	} catch (error) {
		const ms = performance.now() - t;
		if (error.message === "time limit") {
			return { result: null, ms, text: `did not finish (stopped after ${(ms / 1000).toFixed(1)} s)` };
		}
		if (error instanceof RangeError) {
			return { result: null, ms, text: "crashed: call stack overflow (recursion too deep)" };
		}
		throw error;
	}
}

let passed = 0;
let failed = 0;

function check(description, condition) {
	if (condition) passed++;
	else failed++;
	console.log(`${condition ? "PASS" : "FAIL"}: ${description}`);
}

// ---------- 1 & 2. Validate on the sample input ----------

const tasks = [
	{ start: 1, end: 3 },
	{ start: 2, end: 5 },
	{ start: 4, end: 6 },
	{ start: 6, end: 7 },
	{ start: 5, end: 9 },
	{ start: 8, end: 10 },
];

console.log("===== Sample input =====");
const bruteResult = bruteForce(tasks);
const greedyResult = greedy(tasks);
console.log(`Brute force: ${bruteResult.length} tasks -> ${formatTasks(bruteResult)}`);
console.log(`Greedy:      ${greedyResult.length} tasks -> ${formatTasks(greedyResult)}`);

check("brute force finds 4 tasks", bruteResult.length === 4);
check("greedy finds 4 tasks", greedyResult.length === 4);
check("brute force schedule has no overlaps", isValidSchedule(bruteResult));
check("greedy schedule has no overlaps", isValidSchedule(greedyResult));

// Greedy must match brute force on many random small inputs, not just one sample
let allMatch = true;
for (let i = 0; i < 1000; i++) {
	const sample = randomTasks(1 + Math.floor(Math.random() * 15), 30, 8);
	const g = greedy(sample);
	if (bruteForce(sample).length !== g.length || !isValidSchedule(g)) {
		allMatch = false;
		break;
	}
}
check("greedy matches brute force on 1000 random inputs (up to 15 tasks)", allMatch);

// ---------- 2. Timing on a large input ----------

console.log("\n===== 10,000 random tasks =====");
const bigInput = randomTasks(10000, 100000, 50);

const greedyBig = time(() => greedy(bigInput));
console.log(`Greedy:      ${greedyBig.result.length} tasks selected in ${greedyBig.ms.toFixed(2)} ms`);

console.log(`Brute force: ${tryBruteForce(bigInput).text}`);

// Show how brute force grows on inputs it can still finish
console.log("\n===== How brute force grows =====");
console.log("Tasks | Brute force    | Greedy");
for (const n of [10, 15, 20, 25, 30]) {
	// Short tasks spread out, so many combinations are valid (hard case for brute force)
	const input = randomTasks(n, n * 3, 3);
	const b = tryBruteForce(input);
	const g = time(() => greedy(input));
	const bText = b.result === null ? "> 5 s (stopped)" : `${b.ms.toFixed(2)} ms`;
	console.log(`${String(n).padStart(5)} | ${bText.padEnd(14)} | ${g.ms.toFixed(3)} ms`);
}

// ---------- 5. Bonus: stress tests ----------

console.log("\n===== Stress tests =====");

function stressTest(name, input, expected) {
	const g = time(() => greedy(input));
	const b = tryBruteForce(input);

	console.log(`\n${name} (${input.length} tasks)`);
	console.log(`  Greedy:      ${g.result.length} tasks in ${g.ms.toFixed(2)} ms`);
	console.log(`  Brute force: ${b.text}`);

	check(`${name}: greedy finds ${expected}`, g.result.length === expected);
	if (b.result !== null) {
		check(`${name}: brute force finds ${expected}`, b.result.length === expected);
	}
}

// All tasks overlap each other -> only 1 can be picked
const allOverlapping = Array.from({ length: 10000 }, (_, i) => ({ start: i % 10, end: 100 + (i % 10) }));
stressTest("All overlapping", allOverlapping, 1);

// No tasks overlap -> all can be picked
const nonOverlappingSmall = Array.from({ length: 20 }, (_, i) => ({ start: i, end: i + 1 }));
stressTest("Non-overlapping (small)", nonOverlappingSmall, 20);

const nonOverlappingBig = Array.from({ length: 10000 }, (_, i) => ({ start: i, end: i + 1 }));
stressTest("Non-overlapping (large)", nonOverlappingBig, 10000);

// Many tasks share the same start or end time
const sameTimes = [
	{ start: 0, end: 5 },
	{ start: 0, end: 2 },
	{ start: 0, end: 2 },
	{ start: 2, end: 4 },
	{ start: 2, end: 5 },
	{ start: 4, end: 5 },
	{ start: 5, end: 8 },
	{ start: 5, end: 8 },
];
// Best: [0-2] [2-4] [4-5] [5-8]
stressTest("Same start/end times", sameTimes, 4);

console.log(`\n${passed} passed, ${failed} failed`);
