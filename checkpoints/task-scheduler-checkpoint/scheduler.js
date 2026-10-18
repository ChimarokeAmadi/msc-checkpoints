// Lightweight task scheduler
// n = number of tasks, k = number of overlapping pairs found

const PRIORITIES = ["High", "Medium", "Low"];

// ---------- Helpers ----------

// "09:30" -> 570 (minutes since midnight). O(1)
function toMinutes(time) {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
}

// 570 -> "09:30". O(1)
function toTime(minutes) {
	const h = String(Math.floor(minutes / 60)).padStart(2, "0");
	const m = String(minutes % 60).padStart(2, "0");
	return `${h}:${m}`;
}

// Times are converted to numbers once, when the task is created, so sorting
// and overlap checks compare numbers instead of re-parsing strings every time.
// Time O(1), Space O(1)
function createTask(name, start, end, priority) {
	const startMinutes = toMinutes(start);
	const endMinutes = toMinutes(end);

	if (endMinutes <= startMinutes) {
		throw new Error(`Task "${name}": end time must be after start time`);
	}
	if (!PRIORITIES.includes(priority)) {
		throw new Error(`Task "${name}": priority must be one of ${PRIORITIES.join(", ")}`);
	}

	return { name, start: startMinutes, end: endMinutes, priority };
}

function formatTask(task) {
	return `${task.name} (${toTime(task.start)}-${toTime(task.end)}, ${task.priority})`;
}

// ---------- 1. Sort by start time ----------

// Array.prototype.sort is O(n log n) (V8 uses TimSort).
// We sort a copy so the original list is not changed.
// Ties on start time are broken by end time.
// Time O(n log n), Space O(n) for the copy
function sortByStartTime(tasks) {
	return [...tasks].sort((a, b) => a.start - b.start || a.end - b.end);
}

// ---------- 2. Group by priority ----------

// A single pass over the tasks, dropping each into a bucket in a hash map.
// Looking up a bucket is O(1), so the whole thing is O(n).
// (Filtering the list once per priority would also work, but it scans the
// list once for every priority level instead of once in total.)
// Time O(n), Space O(n)
function groupByPriority(tasks) {
	const groups = {};
	for (const priority of PRIORITIES) {
		groups[priority] = [];
	}

	for (const task of tasks) {
		groups[task.priority].push(task);
	}

	return groups;
}

// ---------- 3. Detect overlapping tasks ----------

// Two tasks overlap when one starts before the other ends.
// A task ending at 10:00 and one starting at 10:00 do NOT overlap.
function overlaps(a, b) {
	return a.start < b.end && b.start < a.end;
}

// Naive version: compare every pair of tasks.
// Time O(n²), Space O(k)
function findOverlapsNaive(tasks) {
	const pairs = [];

	for (let i = 0; i < tasks.length; i++) {
		for (let j = i + 1; j < tasks.length; j++) {
			if (overlaps(tasks[i], tasks[j])) {
				pairs.push([tasks[i], tasks[j]]);
			}
		}
	}

	return pairs;
}

// Optimized version (interval scheduling pattern):
// after sorting by start time, a task can only overlap the tasks that start
// before it ends. As soon as we reach a task that starts at or after the
// current task's end, every later task starts even later, so we stop.
// Each inner step either records an overlap or ends the loop, so the
// comparisons cost O(n + k) on top of the sort.
// Time O(n log n + k), Space O(n + k)
function findOverlaps(tasks) {
	const sorted = sortByStartTime(tasks);
	const pairs = [];

	for (let i = 0; i < sorted.length; i++) {
		for (let j = i + 1; j < sorted.length && sorted[j].start < sorted[i].end; j++) {
			pairs.push([sorted[i], sorted[j]]);
		}
	}

	return pairs;
}

// ---------- 4. (Optional) Estimate memory usage ----------

// Rough estimate of the memory the task list takes in V8 (Node / Chrome).
// Real numbers vary with the engine, so this is an approximation.
// Time O(n), Space O(1)
function estimateMemory(tasks) {
	const OBJECT_OVERHEAD = 24; // object header + hidden-class pointer
	const FIELD_SIZE = 8;       // each property slot (pointer or small number)
	const STRING_OVERHEAD = 16; // string header
	const ARRAY_SLOT = 8;       // pointer to the task inside the array

	let bytes = 0;
	for (const task of tasks) {
		const fieldCount = Object.keys(task).length;
		bytes += OBJECT_OVERHEAD + fieldCount * FIELD_SIZE + ARRAY_SLOT;
		// Name strings are stored per task. Priority strings are shared
		// literals ("High", "Medium", "Low"), so they cost nothing extra.
		bytes += STRING_OVERHEAD + task.name.length;
	}

	return bytes;
}

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------- Demo ----------

const tasks = [
	createTask("Team meeting", "09:00", "10:00", "High"),
	createTask("Email replies", "08:30", "09:15", "Low"),
	createTask("Code review", "09:30", "10:30", "Medium"),
	createTask("Lunch", "12:00", "13:00", "Low"),
	createTask("Client call", "10:30", "11:00", "High"),
	createTask("Write report", "13:00", "15:00", "Medium"),
	createTask("Bug fix", "14:00", "14:45", "High"),
];

console.log("===== Tasks sorted by start time =====");
sortByStartTime(tasks).forEach((task) => console.log(formatTask(task)));

console.log("\n===== Tasks grouped by priority =====");
const groups = groupByPriority(sortByStartTime(tasks));
for (const priority of PRIORITIES) {
	console.log(`${priority}:`);
	groups[priority].forEach((task) => console.log(`  ${formatTask(task)}`));
}

console.log("\n===== Overlapping tasks =====");
const overlapping = findOverlaps(tasks);
if (overlapping.length === 0) {
	console.log("No overlapping tasks.");
} else {
	overlapping.forEach(([a, b]) => console.log(`${formatTask(a)}  overlaps  ${formatTask(b)}`));
}

console.log("\n===== Estimated memory =====");
console.log(`${tasks.length} tasks: about ${formatBytes(estimateMemory(tasks))}`);

// ---------- Tests ----------

let passed = 0;
let failed = 0;

function check(description, condition) {
	if (condition) {
		passed++;
	} else {
		failed++;
	}
	console.log(`${condition ? "PASS" : "FAIL"}: ${description}`);
}

function pairKey([a, b]) {
	return [a.name, b.name].sort().join(" | ");
}

console.log("\n===== Tests =====");

const sorted = sortByStartTime(tasks);
check(
	"tasks are sorted by start time",
	sorted.every((task, i) => i === 0 || sorted[i - 1].start <= task.start)
);
check("sorting does not change the original list", tasks[0].name === "Team meeting");

check(
	"every task lands in exactly one priority group",
	PRIORITIES.reduce((sum, p) => sum + groups[p].length, 0) === tasks.length
);
check("High group has 3 tasks", groups.High.length === 3);

const expectedOverlaps = [
	"Email replies | Team meeting",
	"Code review | Team meeting",
	"Bug fix | Write report",
].sort();
check(
	"finds exactly the expected overlaps",
	JSON.stringify(overlapping.map(pairKey).sort()) === JSON.stringify(expectedOverlaps)
);
check(
	"tasks that touch (10:30 end / 10:30 start) do not overlap",
	!overlapping.some((pair) => pairKey(pair) === "Client call | Code review")
);

let threwError = false;
try {
	createTask("Bad task", "10:00", "09:00", "High");
} catch {
	threwError = true;
}
check("rejects a task that ends before it starts", threwError);

// Compare the naive and optimized overlap finders on a large random list
const randomTasks = [];
for (let i = 0; i < 5000; i++) {
	const start = Math.floor(Math.random() * (24 * 60 - 60));
	const length = 5 + Math.floor(Math.random() * 30);
	randomTasks.push(
		createTask(
			`Task ${i}`,
			toTime(start),
			toTime(start + length),
			PRIORITIES[i % PRIORITIES.length]
		)
	);
}

let t = performance.now();
const naiveResult = findOverlapsNaive(randomTasks);
const naiveMs = performance.now() - t;

t = performance.now();
const fastResult = findOverlaps(randomTasks);
const fastMs = performance.now() - t;

check(
	"naive and optimized versions find the same overlaps",
	JSON.stringify(naiveResult.map(pairKey).sort()) === JSON.stringify(fastResult.map(pairKey).sort())
);

console.log(`\n${passed} passed, ${failed} failed`);

console.log("\n===== Naive vs optimized (5000 random tasks) =====");
console.log(`Naive O(n²):           ${naiveMs.toFixed(1)} ms`);
console.log(`Optimized O(n log n+k): ${fastMs.toFixed(1)} ms`);
console.log(`Estimated memory:      ${formatBytes(estimateMemory(randomTasks))}`);
