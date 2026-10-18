class Graph {
	constructor(directed = false) {
		this.directed = directed;
		this.adjacencyList = new Map(); // vertex -> array of neighbours
	}

	addVertex(vertex) {
		if (!this.adjacencyList.has(vertex)) {
			this.adjacencyList.set(vertex, []);
		}
	}

	addEdge(from, to) {
		this.addVertex(from);
		this.addVertex(to);

		if (!this.hasEdge(from, to)) {
			this.adjacencyList.get(from).push(to);
		}
		// In an undirected graph the edge goes both ways
		if (!this.directed && !this.hasEdge(to, from)) {
			this.adjacencyList.get(to).push(from);
		}
	}

	removeEdge(from, to) {
		if (this.adjacencyList.has(from)) {
			this.adjacencyList.set(
				from,
				this.adjacencyList.get(from).filter((v) => v !== to)
			);
		}
		if (!this.directed && this.adjacencyList.has(to)) {
			this.adjacencyList.set(
				to,
				this.adjacencyList.get(to).filter((v) => v !== from)
			);
		}
	}

	hasEdge(from, to) {
		return this.adjacencyList.has(from) && this.adjacencyList.get(from).includes(to);
	}

	printGraph() {
		for (const [vertex, neighbours] of this.adjacencyList) {
			console.log(`${vertex} -> ${neighbours.join(", ")}`);
		}
	}

	// Depth-First Search: go as deep as possible before backtracking
	dfs(start) {
		const visited = new Set();
		const order = [];

		const visit = (vertex) => {
			visited.add(vertex);
			order.push(vertex);

			for (const neighbour of this.adjacencyList.get(vertex)) {
				if (!visited.has(neighbour)) {
					visit(neighbour);
				}
			}
		};

		if (this.adjacencyList.has(start)) {
			visit(start);
		}

		console.log(`DFS from ${start}: ${order.join(" -> ")}`);
		return order;
	}

	// Breadth-First Search: visit all neighbours before going one level deeper
	bfs(start) {
		const visited = new Set();
		const order = [];

		if (!this.adjacencyList.has(start)) {
			console.log(`BFS from ${start}: `);
			return order;
		}

		const queue = [start];
		visited.add(start);

		while (queue.length > 0) {
			const vertex = queue.shift();
			order.push(vertex);

			for (const neighbour of this.adjacencyList.get(vertex)) {
				if (!visited.has(neighbour)) {
					visited.add(neighbour);
					queue.push(neighbour);
				}
			}
		}

		console.log(`BFS from ${start}: ${order.join(" -> ")}`);
		return order;
	}
}

// ---------- Testing ----------

let passed = 0;
let failed = 0;

function check(description, actual, expected) {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (ok) {
		passed++;
	} else {
		failed++;
	}
	console.log(`${ok ? "PASS" : "FAIL"}: ${description}${ok ? "" : ` (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`}`);
}

// Graph used for both tests:
//
//   A --- B
//   |     |
//   C --- D --- E

const edges = [
	["A", "B"],
	["A", "C"],
	["B", "D"],
	["C", "D"],
	["D", "E"],
];

console.log("===== Undirected graph =====");
const undirected = new Graph(false);
edges.forEach(([from, to]) => undirected.addEdge(from, to));
undirected.printGraph();

check("A-B exists", undirected.hasEdge("A", "B"), true);
check("B-A exists (undirected)", undirected.hasEdge("B", "A"), true);
check("A-E does not exist", undirected.hasEdge("A", "E"), false);
check("DFS order", undirected.dfs("A"), ["A", "B", "D", "C", "E"]);
check("BFS order", undirected.bfs("A"), ["A", "B", "C", "D", "E"]);

console.log("\nRemoving edge A-B...");
undirected.removeEdge("A", "B");
undirected.printGraph();

check("A-B removed", undirected.hasEdge("A", "B"), false);
check("B-A removed too (undirected)", undirected.hasEdge("B", "A"), false);
check("DFS order after removal", undirected.dfs("A"), ["A", "C", "D", "B", "E"]);
check("BFS order after removal", undirected.bfs("A"), ["A", "C", "D", "B", "E"]);

console.log("\n===== Directed graph =====");
const directed = new Graph(true);
edges.forEach(([from, to]) => directed.addEdge(from, to));
directed.printGraph();

check("A->B exists", directed.hasEdge("A", "B"), true);
check("B->A does not exist (directed)", directed.hasEdge("B", "A"), false);
check("DFS order", directed.dfs("A"), ["A", "B", "D", "E", "C"]);
check("BFS order", directed.bfs("A"), ["A", "B", "C", "D", "E"]);
check("DFS from C only reaches C, D, E", directed.dfs("C"), ["C", "D", "E"]);

console.log("\nRemoving edge D->E...");
directed.removeEdge("D", "E");
check("D->E removed", directed.hasEdge("D", "E"), false);
check("BFS after removal no longer reaches E", directed.bfs("A"), ["A", "B", "C", "D"]);

console.log(`\n${passed} passed, ${failed} failed`);
