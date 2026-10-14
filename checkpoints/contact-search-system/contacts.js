const readline = require("readline");

class Contact {
	constructor(name, phone) {
		this.name = name;
		this.phone = phone;
	}

	toString() {
		return `${this.name} - ${this.phone}`;
	}
}

class Node {
	constructor(contact) {
		this.contact = contact;
		this.prev = null;
		this.next = null;
	}
}

class DoublyLinkedList {
	constructor() {
		this.head = null;
		this.tail = null;
	}

	append(contact) {
		const node = new Node(contact);

		if (this.head === null) {
			this.head = node;
			this.tail = node;
		} else {
			node.prev = this.tail;
			this.tail.next = node;
			this.tail = node;
		}
	}

	*forward() {
		let current = this.head;
		while (current) {
			yield current.contact;
			current = current.next;
		}
	}

	*backward() {
		let current = this.tail;
		while (current) {
			yield current.contact;
			current = current.prev;
		}
	}
}

// Naive string matching: returns true if pattern appears anywhere in text
function naiveSearch(text, pattern) {
	const n = text.length;
	const m = pattern.length;

	for (let i = 0; i <= n - m; i++) {
		let j = 0;
		while (j < m && text[i + j] === pattern[j]) {
			j++;
		}
		if (j === m) {
			return true;
		}
	}

	return false;
}

class ContactBook {
	constructor() {
		this.contacts = new DoublyLinkedList();
		this.byName = new Map();
	}

	add(name, phone) {
		const key = name.toLowerCase();
		if (this.byName.has(key)) {
			return false;
		}

		const contact = new Contact(name, phone);
		// Same object stored in both structures
		this.contacts.append(contact);
		this.byName.set(key, contact);
		return true;
	}

	searchByKeyword(keyword) {
		const lowerKeyword = keyword.toLowerCase();
		return [...this.contacts.forward()].filter((contact) =>
			naiveSearch(contact.name.toLowerCase(), lowerKeyword),
		);
	}

	searchByName(name) {
		return this.byName.get(name.toLowerCase());
	}
}

function printContacts(contacts) {
	const list = [...contacts];
	if (list.length === 0) {
		console.log("No contacts yet.");
		return;
	}

	list.forEach((contact) => console.log(contact.toString()));
}

// ---------- Text menu ----------

const rl = readline.createInterface({ input: process.stdin });
const pendingLines = [];
const waiting = [];

rl.on("line", (line) => {
	if (waiting.length > 0) {
		waiting.shift()(line);
	} else {
		pendingLines.push(line);
	}
});

rl.on("close", () => {
	waiting.forEach((resolve) => resolve(null));
});

function ask(prompt) {
	process.stdout.write(prompt);
	if (pendingLines.length > 0) {
		return Promise.resolve(pendingLines.shift());
	}
	return new Promise((resolve) => waiting.push(resolve));
}

async function main() {
	const book = new ContactBook();

	while (true) {
		console.log();
		console.log("1. Add Contact");
		console.log("2. Search by Keyword");
		console.log("3. Search by Exact Name");
		console.log("4. View All (Forward)");
		console.log("5. View All (Backward)");
		console.log("6. Exit");
		console.log();

		const answer = await ask("Enter option: ");
		if (answer === null) break; // input closed

		const option = answer.trim();

		if (option === "1") {
			const name = ((await ask("Name: ")) ?? "").trim();
			const phone = ((await ask("Phone: ")) ?? "").trim();

			if (!name || !phone) {
				console.log("Name and phone are required.");
			} else if (book.add(name, phone)) {
				console.log("Contact added.");
			} else {
				console.log(`A contact named ${name} already exists.`);
			}
		} else if (option === "2") {
			const keyword = ((await ask("Search keyword: ")) ?? "").trim();
			const matches = book.searchByKeyword(keyword);

			if (matches.length > 0) {
				matches.forEach((contact) => console.log(`Match found: ${contact}`));
			} else {
				console.log("No matches found.");
			}
		} else if (option === "3") {
			const name = ((await ask("Name: ")) ?? "").trim();
			const contact = book.searchByName(name);

			if (contact) {
				console.log(`Found: ${contact}`);
			} else {
				console.log("Contact not found.");
			}
		} else if (option === "4") {
			printContacts(book.contacts.forward());
		} else if (option === "5") {
			printContacts(book.contacts.backward());
		} else if (option === "6") {
			console.log("Goodbye!");
			break;
		} else {
			console.log("Invalid option. Please choose 1-6.");
		}
	}

	rl.close();
}

main();
