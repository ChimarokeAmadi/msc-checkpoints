// Dijkstra's algorithm: shortest distances from one vertex to all others
// in a graph with non-negative edge weights.
// Run with: node dijkstra.js

// ---------- Min-heap priority queue ----------

// Always gives back the entry with the smallest distance first.
// push O(log n), pop O(log n)
class MinHeap {
	constructor() {
		this.heap = [];
	}

	isEmpty() {
		return this.heap.length === 0;
	}

	push(entry) {
		this.heap.push(entry);
		let i = this.heap.length - 1;

		while (i > 0) {
			const parent = Math.floor((i - 1) / 2);
			if (this.heap[parent].distance <= this.heap[i].distance) break;
			[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
			i = parent;
		}
	}

	pop() {
		const top = this.heap[0];
		const last = this.heap.pop();

		if (this.heap.length > 0) {
			this.heap[0] = last;
			let i = 0;

			while (true) {
				const left = 2 * i + 1;
				const right = 2 * i + 2;
				let smallest = i;

				if (left < this.heap.length && this.heap[left].distance < this.heap[smallest].distance) {
					smallest = left;
				}
				if (right < this.heap.length && this.heap[right].distance < this.heap[smallest].distance) {
					smallest = right;
				}
				if (smallest === i) break;

				[this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
				i = smallest;
			}
		}

		return top;
	}
}

// ---------- Dijkstra ----------

// 1. Every vertex starts at distance Infinity, except the start, which is 0.
// 2. Take the unvisited vertex with the smallest known distance (from the heap).
//    Its distance is now final.
// 3. For each neighbour, check whether going through this vertex is shorter
//    than the best distance found so far. If it is, update it and add it to the heap.
// 4. Repeat until the heap is empty.
//
// Vertices that can't be reached from the start keep the distance Infinity.
// Time O((V + E) log V), Space O(V + E)
function dijkstra(graph, start) {
	if (!(start in graph)) {
		throw new Error(`Start vertex "${start}" is not in the graph`);
	}

	// Include vertices that only appear as neighbours, not as keys
	const vertices = new Set(Object.keys(graph));
	for (const neighbours of Object.values(graph)) {
		for (const [neighbour, weight] of Object.entries(neighbours)) {
			if (weight < 0) {
				throw new Error("Dijkstra's algorithm does not work with negative weights");
			}
			vertices.add(neighbour);
		}
	}

	const distances = {};
	for (const vertex of vertices) {
		distances[vertex] = Infinity;
	}
	distances[start] = 0;

	const visited = new Set();
	const heap = new MinHeap();
	heap.push({ vertex: start, distance: 0 });

	while (!heap.isEmpty()) {
		const { vertex, distance } = heap.pop();

		// The same vertex can be in the heap more than once with an older,
		// longer distance. Skip it if we've already finalised this vertex.
		if (visited.has(vertex)) continue;
		visited.add(vertex);

		const neighbours = graph[vertex] || {};
		for (const [neighbour, weight] of Object.entries(neighbours)) {
			const newDistance = distance + weight;
			if (newDistance < distances[neighbour]) {
				distances[neighbour] = newDistance;
				heap.push({ vertex: neighbour, distance: newDistance });
			}
		}
	}

	return distances;
}

// ---------- Example from the checkpoint ----------

const graph = {
	A: { B: 4, C: 2 },
	B: { A: 4, C: 5, D: 10 },
	C: { A: 2, B: 5, D: 3 },
	D: { B: 10, C: 3 },
};

console.log("dijkstra(graph, 'A'):");
console.log(dijkstra(graph, "A"));

// ---------- Tests ----------

let passed = 0;
let failed = 0;

function check(description, actual, expected) {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (ok) passed++;
	else failed++;
	console.log(`${ok ? "PASS" : "FAIL"}: ${description}${ok ? "" : `\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`}`);
}

console.log("\n===== Tests =====");

check("example graph from A", dijkstra(graph, "A"), { A: 0, B: 4, C: 2, D: 5 });
check("example graph from D", dijkstra(graph, "D"), { A: 5, B: 8, C: 3, D: 0 });

// The direct edge is not always the shortest: A->B costs 10, but A->C->B costs 3
const detour = {
	A: { B: 10, C: 1 },
	B: {},
	C: { B: 2 },
};
check("prefers a cheaper path through another vertex", dijkstra(detour, "A"), { A: 0, B: 3, C: 1 });

// Directed graph where E can't be reached from A
const directed = {
	A: { B: 1 },
	B: { C: 2 },
	C: {},
	E: { A: 1 },
};
const directedResult = dijkstra(directed, "A");
check(
	"unreachable vertex stays at Infinity",
	[directedResult.A, directedResult.B, directedResult.C, directedResult.E],
	[0, 1, 3, Infinity]
);

// D only appears as a neighbour, never as its own key
check("includes vertices that only appear as neighbours", dijkstra({ A: { D: 7 } }, "A"), { A: 0, D: 7 });

check("graph with a single vertex", dijkstra({ A: {} }, "A"), { A: 0 });

check("zero-weight edges", dijkstra({ A: { B: 0 }, B: { C: 0 }, C: {} }, "A"), { A: 0, B: 0, C: 0 });

function throwsError(fn) {
	try {
		fn();
		return false;
	} catch {
		return true;
	}
}
check("throws if the start vertex is missing", throwsError(() => dijkstra(graph, "Z")), true);
check("throws on negative weights", throwsError(() => dijkstra({ A: { B: -1 }, B: {} }, "A")), true);

console.log(`\n${passed} passed, ${failed} failed`);
