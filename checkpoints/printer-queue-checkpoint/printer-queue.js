// Shared office printer simulation using a FIFO queue
// Run with: node printer-queue.js

// ---------- Queue ----------

class Node {
	constructor(value) {
		this.value = value;
		this.next = null;
	}
}

// Singly linked list with pointers to the front and back,
// so enqueue and dequeue are both O(1).
class Queue {
	constructor() {
		this.front = null;
		this.back = null;
		this.size = 0;
	}

	// Add an item to the back of the queue
	enqueue(item) {
		const node = new Node(item);
		if (this.back === null) {
			this.front = node;
		} else {
			this.back.next = node;
		}
		this.back = node;
		this.size++;
	}

	// Remove and return the item at the front of the queue
	dequeue() {
		if (this.isEmpty()) {
			return null;
		}
		const item = this.front.value;
		this.front = this.front.next;
		if (this.front === null) {
			this.back = null;
		}
		this.size--;
		return item;
	}

	// Return the item at the front without removing it
	peek() {
		return this.isEmpty() ? null : this.front.value;
	}

	isEmpty() {
		return this.size === 0;
	}

	// Return all items from front to back (used for printing the queue)
	toArray() {
		const items = [];
		let current = this.front;
		while (current) {
			items.push(current.value);
			current = current.next;
		}
		return items;
	}
}

// ---------- Printer queue ----------

class PrinterQueue {
	constructor() {
		this.jobs = new Queue();
	}

	addJob(name, pages) {
		if (!name || typeof name !== "string") {
			console.log("Job not added: a job needs a name.");
			return false;
		}
		if (!Number.isInteger(pages) || pages <= 0) {
			console.log(`Job "${name}" not added: pages must be a whole number above 0.`);
			return false;
		}

		this.jobs.enqueue({ name, pages });
		console.log(`Added: "${name}" (${pages} ${pages === 1 ? "page" : "pages"})`);
		return true;
	}

	// Print the job at the front of the queue
	processJob() {
		const job = this.jobs.dequeue();
		if (job === null) {
			console.log("No jobs to print.");
			return null;
		}

		console.log(`Printing: "${job.name}" (${job.pages} ${job.pages === 1 ? "page" : "pages"})... done.`);
		return job;
	}

	// Print every job until the queue is empty
	processAllJobs() {
		const printed = [];
		while (!this.jobs.isEmpty()) {
			printed.push(this.processJob());
		}
		return printed;
	}

	printQueue() {
		if (this.jobs.isEmpty()) {
			console.log("Print queue is empty.");
			return;
		}

		console.log("Print queue (next job first):");
		this.jobs.toArray().forEach((job, i) => {
			console.log(`  ${i + 1}. "${job.name}" - ${job.pages} ${job.pages === 1 ? "page" : "pages"}`);
		});
	}
}

// ---------- Testing ----------

const printer = new PrinterQueue();

console.log("===== Employees send print jobs =====");
printer.addJob("Alice - Quarterly Report", 12);
printer.addJob("Bob - Meeting Notes", 3);
printer.addJob("Chioma - Invoice", 1);
printer.addJob("David - Presentation Slides", 20);

console.log("\n===== Current queue =====");
printer.printQueue();
console.log(`Next up: "${printer.jobs.peek().name}"`);

console.log("\n===== Printer processes two jobs =====");
printer.processJob();
printer.processJob();

console.log("\n===== Queue after processing two jobs =====");
printer.printQueue();

console.log("\n===== A new job arrives while printing =====");
printer.addJob("Emeka - Contract", 5);
printer.printQueue();

console.log("\n===== Printer processes the rest =====");
printer.processAllJobs();

console.log("\n===== Queue at the end =====");
printer.printQueue();
printer.processJob();

console.log("\n===== Invalid jobs =====");
printer.addJob("", 4);
printer.addJob("Frank - Memo", 0);
printer.addJob("Grace - Poster", 2.5);

// ---------- Checks ----------

let passed = 0;
let failed = 0;

function check(description, condition) {
	if (condition) passed++;
	else failed++;
	console.log(`${condition ? "PASS" : "FAIL"}: ${description}`);
}

console.log("\n===== Tests =====");

const test = new PrinterQueue();
const originalLog = console.log;
console.log = () => {}; // keep the test output short
test.addJob("Job 1", 1);
test.addJob("Job 2", 2);
test.addJob("Job 3", 3);
const peeked = test.jobs.peek();
const first = test.processJob();
test.addJob("Job 4", 4);
const rest = test.processAllJobs();
const emptyResult = test.processJob();
const rejected = !test.addJob("Bad", -1);
console.log = originalLog;

check("peek returns the first job without removing it", peeked.name === "Job 1" && first.name === "Job 1");
check(
	"jobs are printed in the order they arrived (FIFO)",
	[first, ...rest].map((job) => job.name).join(", ") === "Job 1, Job 2, Job 3, Job 4"
);
check("queue is empty after all jobs are printed", test.jobs.isEmpty());
check("processing an empty queue returns null", emptyResult === null);
check("invalid jobs are rejected", rejected && test.jobs.isEmpty());

console.log(`\n${passed} passed, ${failed} failed`);
