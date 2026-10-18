// Network Cable Optimization: Minimum Spanning Tree with Kruskal's algorithm
//
//   node mst.js                -> runs the sample office network and the tests
//   node mst.js --interactive  -> menu to add computers and cables yourself

const readline = require("readline");

// ---------- Graph ----------

// Computers are vertices, cables are edges with a cost (weight).
// Stored as a simple list of edges, which is what Kruskal's algorithm needs.
class Network {
	constructor() {
		this.computers = new Set();
		this.cables = []; // { from, to, cost }
	}

	addComputer(name) {
		this.computers.add(name);
	}

	addCable(from, to, cost) {
		if (from === to) {
			throw new Error("A cable must connect two different computers");
		}
		if (!Number.isFinite(cost) || cost < 0) {
			throw new Error("Cost must be a number that is 0 or more");
		}
		this.addComputer(from);
		this.addComputer(to);
		this.cables.push({ from, to, cost });
	}
}

// ---------- Disjoint Set (Union-Find) ----------

// Keeps track of which computers are already connected to each other.
// If two computers have the same root, adding a cable between them would make a loop.
class DisjointSet {
	constructor(items) {
		this.parent = new Map();
		this.rank = new Map();
		for (const item of items) {
			this.parent.set(item, item);
			this.rank.set(item, 0);
		}
	}

	// Path compression: point every node on the way straight at the root
	find(item) {
		if (this.parent.get(item) !== item) {
			this.parent.set(item, this.find(this.parent.get(item)));
		}
		return this.parent.get(item);
	}

	// Union by rank: attach the shorter tree under the taller one.
	// Returns false if the two were already in the same set.
	union(a, b) {
		const rootA = this.find(a);
		const rootB = this.find(b);
		if (rootA === rootB) return false;

		const rankA = this.rank.get(rootA);
		const rankB = this.rank.get(rootB);
		if (rankA < rankB) {
			this.parent.set(rootA, rootB);
		} else if (rankA > rankB) {
			this.parent.set(rootB, rootA);
		} else {
			this.parent.set(rootB, rootA);
			this.rank.set(rootA, rankA + 1);
		}
		return true;
	}
}

// ---------- Kruskal's algorithm ----------

// 1. Sort all cables from cheapest to most expensive.
// 2. Go through them in order and keep a cable only if it joins two computers
//    that aren't connected yet (otherwise it would create a loop).
// 3. Stop once we have (number of computers - 1) cables.
// Time O(E log E) for the sort, Space O(V + E)
function kruskal(network) {
	const sortedCables = [...network.cables].sort((a, b) => a.cost - b.cost);
	const sets = new DisjointSet(network.computers);
	const selected = [];
	let totalCost = 0;

	for (const cable of sortedCables) {
		if (selected.length === network.computers.size - 1) break;

		if (sets.union(cable.from, cable.to)) {
			selected.push(cable);
			totalCost += cable.cost;
		}
	}

	// If some computers can't be reached, there are fewer than V - 1 cables
	const connected = network.computers.size === 0 || selected.length === network.computers.size - 1;

	return { selected, totalCost, connected };
}

function printResult(result) {
	if (result.selected.length === 0) {
		console.log("No cables selected.");
	} else {
		console.log("Selected connections:");
		result.selected.forEach(({ from, to, cost }) => console.log(`  ${from} - ${to}  (cost ${cost})`));
	}
	console.log(`Total cost of the network: ${result.totalCost}`);

	if (!result.connected) {
		console.log("Warning: not every computer can be connected with the cables available.");
	}
}

// ---------- Sample office network ----------

function sampleNetwork() {
	// Six computers (A-F) and eight possible cables.
	// Expected MST: B-C (1), B-D (2), D-E (2), A-C (3), D-F (5) = 13
	const network = new Network();
	network.addCable("A", "B", 4);
	network.addCable("A", "C", 3);
	network.addCable("B", "C", 1);
	network.addCable("B", "D", 2);
	network.addCable("C", "D", 4);
	network.addCable("D", "E", 2);
	network.addCable("D", "F", 5);
	network.addCable("E", "F", 6);
	return network;
}

// ---------- Tests ----------

function runDemoAndTests() {
	console.log("===== Sample office network =====");
	const network = sampleNetwork();
	console.log(`Computers: ${[...network.computers].join(", ")}`);
	console.log("Possible cables:");
	network.cables.forEach(({ from, to, cost }) => console.log(`  ${from} - ${to}  (cost ${cost})`));

	console.log();
	const result = kruskal(network);
	printResult(result);

	let passed = 0;
	let failed = 0;
	function check(description, condition) {
		if (condition) passed++;
		else failed++;
		console.log(`${condition ? "PASS" : "FAIL"}: ${description}`);
	}

	console.log("\n===== Tests =====");
	check("total cost is 13", result.totalCost === 13);
	check("uses 5 cables for 6 computers", result.selected.length === 5);
	check("every computer is connected", result.connected);

	// No loops: re-adding the selected cables to a fresh Union-Find must never hit a cycle
	const checkSets = new DisjointSet(network.computers);
	check(
		"selected cables contain no loops",
		result.selected.every(({ from, to }) => checkSets.union(from, to))
	);

	// Two separate groups that can't reach each other
	const split = new Network();
	split.addCable("A", "B", 1);
	split.addCable("C", "D", 2);
	const splitResult = kruskal(split);
	check("detects a network that can't be fully connected", !splitResult.connected);

	// One computer, no cables
	const single = new Network();
	single.addComputer("A");
	const singleResult = kruskal(single);
	check("single computer needs no cables", singleResult.selected.length === 0 && singleResult.connected);

	// Several cables between the same two computers: only the cheapest is used
	const duplicates = new Network();
	duplicates.addCable("A", "B", 9);
	duplicates.addCable("A", "B", 2);
	duplicates.addCable("B", "C", 3);
	check("picks the cheapest of duplicate cables", kruskal(duplicates).totalCost === 5);

	let rejected = false;
	try {
		duplicates.addCable("A", "A", 1);
	} catch {
		rejected = true;
	}
	check("rejects a cable from a computer to itself", rejected);

	console.log(`\n${passed} passed, ${failed} failed`);
	console.log("\nRun `node mst.js --interactive` to build your own network.");
}

// ---------- Bonus: interactive menu ----------

function runInteractive() {
	const rl = readline.createInterface({ input: process.stdin });
	const pendingLines = [];
	const waiting = [];

	rl.on("line", (line) => {
		if (waiting.length > 0) waiting.shift()(line);
		else pendingLines.push(line);
	});
	rl.on("close", () => waiting.forEach((resolve) => resolve(null)));

	function ask(prompt) {
		process.stdout.write(prompt);
		if (pendingLines.length > 0) return Promise.resolve(pendingLines.shift());
		return new Promise((resolve) => waiting.push(resolve));
	}

	async function menu() {
		let network = new Network();

		while (true) {
			console.log();
			console.log("1. Add Computer");
			console.log("2. Add Cable");
			console.log("3. Show Network");
			console.log("4. Compute Cheapest Layout (MST)");
			console.log("5. Load Sample Office Network");
			console.log("6. Clear Network");
			console.log("7. Exit");
			console.log();

			const answer = await ask("Enter option: ");
			if (answer === null) break;
			const option = answer.trim();

			if (option === "1") {
				const name = ((await ask("Computer name: ")) ?? "").trim();
				if (!name) {
					console.log("Name is required.");
				} else if (network.computers.has(name)) {
					console.log(`${name} already exists.`);
				} else {
					network.addComputer(name);
					console.log(`Computer ${name} added.`);
				}
			} else if (option === "2") {
				const from = ((await ask("From computer: ")) ?? "").trim();
				const to = ((await ask("To computer: ")) ?? "").trim();
				const cost = Number(((await ask("Cable cost: ")) ?? "").trim());

				if (!from || !to) {
					console.log("Both computer names are required.");
				} else {
					try {
						network.addCable(from, to, cost);
						console.log(`Cable ${from} - ${to} (cost ${cost}) added.`);
					} catch (error) {
						console.log(error.message);
					}
				}
			} else if (option === "3") {
				if (network.computers.size === 0) {
					console.log("The network is empty.");
				} else {
					console.log(`Computers: ${[...network.computers].join(", ")}`);
					if (network.cables.length === 0) {
						console.log("No cables yet.");
					} else {
						console.log("Cables:");
						network.cables.forEach(({ from, to, cost }) => console.log(`  ${from} - ${to}  (cost ${cost})`));
					}
				}
			} else if (option === "4") {
				if (network.computers.size === 0) {
					console.log("Add some computers and cables first.");
				} else {
					printResult(kruskal(network));
				}
			} else if (option === "5") {
				network = sampleNetwork();
				console.log("Sample office network loaded (computers A-F).");
			} else if (option === "6") {
				network = new Network();
				console.log("Network cleared.");
			} else if (option === "7") {
				console.log("Goodbye!");
				break;
			} else {
				console.log("Invalid option. Please choose 1-7.");
			}
		}

		rl.close();
	}

	menu();
}

if (process.argv.includes("--interactive")) {
	runInteractive();
} else {
	runDemoAndTests();
}
