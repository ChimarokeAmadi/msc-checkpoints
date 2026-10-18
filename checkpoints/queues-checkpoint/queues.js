// ===================== Queues =====================

// Array-based queue with a fixed size.
// Uses a circular buffer: front and back wrap around to the start of the
// array, so dequeue doesn't have to shift every element.
// enqueue O(1), dequeue O(1), peek O(1), isEmpty O(1)
class ArrayQueue {
	constructor(capacity) {
		this.items = new Array(capacity);
		this.capacity = capacity;
		this.front = 0; // index of the front element
		this.size = 0;
	}

	enqueue(element) {
		if (this.isFull()) {
			throw new Error("Queue is full");
		}
		const back = (this.front + this.size) % this.capacity;
		this.items[back] = element;
		this.size++;
	}

	dequeue() {
		if (this.isEmpty()) {
			throw new Error("Queue is empty");
		}
		const element = this.items[this.front];
		this.items[this.front] = undefined;
		this.front = (this.front + 1) % this.capacity;
		this.size--;
		return element;
	}

	peek() {
		return this.isEmpty() ? null : this.items[this.front];
	}

	isEmpty() {
		return this.size === 0;
	}

	isFull() {
		return this.size === this.capacity;
	}
}

class ListNode {
	constructor(value) {
		this.value = value;
		this.next = null;
	}
}

// Linked list-based queue with a dynamic size.
// Keeps a pointer to both the head (front) and tail (back),
// so adding and removing are both O(1).
// enqueue O(1), dequeue O(1), peek O(1), isEmpty O(1)
class LinkedListQueue {
	constructor() {
		this.head = null;
		this.tail = null;
		this.size = 0;
	}

	enqueue(element) {
		const node = new ListNode(element);
		if (this.tail === null) {
			this.head = node;
		} else {
			this.tail.next = node;
		}
		this.tail = node;
		this.size++;
	}

	dequeue() {
		if (this.isEmpty()) {
			throw new Error("Queue is empty");
		}
		const element = this.head.value;
		this.head = this.head.next;
		if (this.head === null) {
			this.tail = null;
		}
		this.size--;
		return element;
	}

	peek() {
		return this.isEmpty() ? null : this.head.value;
	}

	isEmpty() {
		return this.size === 0;
	}
}

// ===================== Priority queues =====================

// Elements can be plain numbers, or objects with a `priority` field,
// e.g. { value: "Fix bug", priority: 1 }. A lower number means higher priority.
function priorityOf(element) {
	return typeof element === "object" && element !== null ? element.priority : element;
}

// Min-heap-based priority queue.
// The heap is stored in an array: the children of index i are at 2i+1 and 2i+2,
// and every parent is smaller than (or equal to) its children.
// insert O(log n), extractMin O(log n), peekMin O(1), isEmpty O(1)
class MinHeapPriorityQueue {
	constructor() {
		this.heap = [];
	}

	insert(element) {
		this.heap.push(element);
		this.bubbleUp(this.heap.length - 1);
	}

	extractMin() {
		if (this.isEmpty()) {
			throw new Error("Priority queue is empty");
		}
		const min = this.heap[0];
		const last = this.heap.pop();
		if (!this.isEmpty()) {
			this.heap[0] = last;
			this.bubbleDown(0);
		}
		return min;
	}

	peekMin() {
		return this.isEmpty() ? null : this.heap[0];
	}

	isEmpty() {
		return this.heap.length === 0;
	}

	// Move an element up until its parent is smaller
	bubbleUp(index) {
		while (index > 0) {
			const parent = Math.floor((index - 1) / 2);
			if (priorityOf(this.heap[parent]) <= priorityOf(this.heap[index])) break;
			this.swap(parent, index);
			index = parent;
		}
	}

	// Move an element down until both children are bigger
	bubbleDown(index) {
		const length = this.heap.length;
		while (true) {
			const left = 2 * index + 1;
			const right = 2 * index + 2;
			let smallest = index;

			if (left < length && priorityOf(this.heap[left]) < priorityOf(this.heap[smallest])) {
				smallest = left;
			}
			if (right < length && priorityOf(this.heap[right]) < priorityOf(this.heap[smallest])) {
				smallest = right;
			}
			if (smallest === index) break;

			this.swap(index, smallest);
			index = smallest;
		}
	}

	swap(i, j) {
		[this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
	}
}

// Ordered array-based priority queue.
// The array is kept sorted from highest priority number to lowest, so the
// minimum is always at the END. That way extractMin is a pop() (O(1))
// instead of a shift() (O(n)).
// insert O(n) (binary search finds the spot in O(log n), but splice shifts elements),
// extractMin O(1), peekMin O(1), isEmpty O(1)
class OrderedArrayPriorityQueue {
	constructor() {
		this.items = [];
	}

	insert(element) {
		const priority = priorityOf(element);

		// Binary search for the first position whose priority is <= the new one.
		// Inserting there puts equal priorities in first-in, first-out order.
		let low = 0;
		let high = this.items.length;
		while (low < high) {
			const mid = Math.floor((low + high) / 2);
			if (priorityOf(this.items[mid]) > priority) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		this.items.splice(low, 0, element);
	}

	extractMin() {
		if (this.isEmpty()) {
			throw new Error("Priority queue is empty");
		}
		return this.items.pop();
	}

	peekMin() {
		return this.isEmpty() ? null : this.items[this.items.length - 1];
	}

	isEmpty() {
		return this.items.length === 0;
	}
}

// ===================== Tests =====================

let passed = 0;
let failed = 0;

function check(description, condition) {
	if (condition) passed++;
	else failed++;
	console.log(`${condition ? "PASS" : "FAIL"}: ${description}`);
}

function throws(fn, message) {
	try {
		fn();
		return false;
	} catch (error) {
		return error.message === message;
	}
}

function testQueue(name, createQueue) {
	console.log(`\n===== ${name} =====`);
	const queue = createQueue();

	check("new queue is empty", queue.isEmpty());
	check("peek on empty queue returns null", queue.peek() === null);
	check("dequeue on empty queue throws", throws(() => queue.dequeue(), "Queue is empty"));

	queue.enqueue("A");
	queue.enqueue("B");
	queue.enqueue("C");
	check("not empty after enqueue", !queue.isEmpty());
	check("peek returns the front element", queue.peek() === "A");
	check("peek does not remove the element", queue.peek() === "A");

	const order = [queue.dequeue(), queue.dequeue(), queue.dequeue()];
	check("dequeues in first-in, first-out order", order.join("") === "ABC");
	check("empty again after removing everything", queue.isEmpty());
	check("dequeue on emptied queue throws", throws(() => queue.dequeue(), "Queue is empty"));

	queue.enqueue("D");
	check("works again after being emptied", queue.peek() === "D" && queue.dequeue() === "D");
}

testQueue("Array-based queue", () => new ArrayQueue(3));
testQueue("Linked list-based queue", () => new LinkedListQueue());

console.log("\n===== Array-based queue: fixed size =====");
const fixed = new ArrayQueue(3);
fixed.enqueue(1);
fixed.enqueue(2);
fixed.enqueue(3);
check("queue reports full at capacity", fixed.isFull());
check("enqueue on a full queue throws", throws(() => fixed.enqueue(4), "Queue is full"));
fixed.dequeue();
fixed.enqueue(4); // wraps around to the start of the array
check(
	"space freed by dequeue is reused (wrap-around)",
	fixed.dequeue() === 2 && fixed.dequeue() === 3 && fixed.dequeue() === 4
);

console.log("\n===== Linked list-based queue: dynamic size =====");
const dynamic = new LinkedListQueue();
for (let i = 0; i < 10000; i++) dynamic.enqueue(i);
let inOrder = true;
for (let i = 0; i < 10000; i++) {
	if (dynamic.dequeue() !== i) inOrder = false;
}
check("grows to 10,000 elements with no fixed limit, order kept", inOrder && dynamic.isEmpty());

function testPriorityQueue(name, createPQ) {
	console.log(`\n===== ${name} =====`);
	const pq = createPQ();

	check("new priority queue is empty", pq.isEmpty());
	check("peekMin on empty returns null", pq.peekMin() === null);
	check("extractMin on empty throws", throws(() => pq.extractMin(), "Priority queue is empty"));

	[5, 3, 8, 1, 9, 2].forEach((n) => pq.insert(n));
	check("peekMin returns the smallest", pq.peekMin() === 1);
	check("peekMin does not remove it", pq.peekMin() === 1);

	const order = [];
	while (!pq.isEmpty()) order.push(pq.extractMin());
	check("extractMin returns elements smallest first", order.join(",") === "1,2,3,5,8,9");
	check("extractMin on emptied queue throws", throws(() => pq.extractMin(), "Priority queue is empty"));

	// Duplicate priorities
	[4, 4, 1, 4].forEach((n) => pq.insert(n));
	const dupes = [pq.extractMin(), pq.extractMin(), pq.extractMin(), pq.extractMin()];
	check("handles duplicate priorities", dupes.join(",") === "1,4,4,4");

	// Objects with a priority field
	pq.insert({ value: "Write tests", priority: 3 });
	pq.insert({ value: "Fix outage", priority: 1 });
	pq.insert({ value: "Reply to email", priority: 5 });
	check("works with { value, priority } objects", pq.extractMin().value === "Fix outage");
	pq.extractMin();
	pq.extractMin();

	// Random numbers compared against a normal sort
	const numbers = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 500));
	numbers.forEach((n) => pq.insert(n));
	const extracted = [];
	while (!pq.isEmpty()) extracted.push(pq.extractMin());
	const expected = [...numbers].sort((a, b) => a - b);
	check("1,000 random numbers come out in sorted order", extracted.join(",") === expected.join(","));
}

testPriorityQueue("Min-heap priority queue", () => new MinHeapPriorityQueue());
testPriorityQueue("Ordered array priority queue", () => new OrderedArrayPriorityQueue());

console.log(`\n${passed} passed, ${failed} failed`);
