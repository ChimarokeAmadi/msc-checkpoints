// Decision Making (if-else and switch)
// Run with: node decision-making.js

const readline = require("readline");

// ---------- 1. Leap Year Checker (if-else) ----------

// Divisible by 4 -> leap year,
// except years divisible by 100, which are NOT leap years,
// except years divisible by 400, which ARE leap years.
function isLeapYear(year) {
	if (year % 400 === 0) {
		return true;
	} else if (year % 100 === 0) {
		return false;
	} else if (year % 4 === 0) {
		return true;
	} else {
		return false;
	}
}

// ---------- 2. Ticket Pricing (switch) ----------

// switch (true) runs the first case whose condition is true
function getTicketPrice(age) {
	switch (true) {
		case age <= 12:
			return { category: "Child", price: 10 };
		case age <= 17:
			return { category: "Teenager", price: 15 };
		default:
			return { category: "Adult", price: 20 };
	}
}

// ---------- 3. Weather Clothing Adviser (if-else + switch) ----------

// temperature is in °C, isRaining is true or false
function getClothingAdvice(temperature, isRaining) {
	let advice;

	if (temperature < 0) {
		advice = "It's freezing. Wear a heavy coat, a scarf, gloves and a warm hat.";
	} else if (temperature < 10) {
		advice = "It's cold. Wear a warm coat and long trousers.";
	} else if (temperature < 20) {
		advice = "It's cool. A sweater or light jacket should be enough.";
	} else if (temperature < 30) {
		advice = "It's warm. A t-shirt and light trousers or shorts are fine.";
	} else {
		advice = "It's hot. Wear light, loose clothes, a hat, and drink plenty of water.";
	}

	switch (isRaining) {
		case true:
			advice += " It's raining, so take an umbrella or a raincoat and wear waterproof shoes.";
			break;
		case false:
			advice += " No rain, so no umbrella needed.";
			break;
	}

	return advice;
}

// ---------- Menu ----------

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

async function askText(prompt) {
	return ((await ask(prompt)) ?? "").trim();
}

async function main() {
	while (true) {
		console.log();
		console.log("1. Leap Year Checker");
		console.log("2. Ticket Pricing");
		console.log("3. Weather Clothing Adviser");
		console.log("4. Exit");
		console.log();

		const answer = await ask("Enter option: ");
		if (answer === null) break;

		switch (answer.trim()) {
			case "1": {
				const year = Number(await askText("Enter a year: "));
				if (!Number.isInteger(year) || year <= 0) {
					console.log("Please enter a valid year, like 2024.");
				} else if (isLeapYear(year)) {
					console.log(`${year} is a leap year.`);
				} else {
					console.log(`${year} is not a leap year.`);
				}
				break;
			}

			case "2": {
				const age = Number(await askText("Enter your age: "));
				if (!Number.isInteger(age) || age < 0 || age > 120) {
					console.log("Please enter a valid age.");
				} else {
					const { category, price } = getTicketPrice(age);
					console.log(`${category} ticket: $${price}`);
				}
				break;
			}

			case "3": {
				const temperatureText = await askText("Current temperature in °C: ");
				const temperature = Number(temperatureText);
				if (temperatureText === "" || !Number.isFinite(temperature)) {
					console.log("Please enter a number for the temperature.");
					break;
				}

				const rain = (await askText("Is it raining? (yes/no): ")).toLowerCase();
				let isRaining;
				switch (rain) {
					case "yes":
					case "y":
						isRaining = true;
						break;
					case "no":
					case "n":
						isRaining = false;
						break;
					default:
						console.log("Please answer yes or no.");
				}

				if (isRaining !== undefined) {
					console.log(getClothingAdvice(temperature, isRaining));
				}
				break;
			}

			case "4":
				console.log("Goodbye!");
				rl.close();
				return;

			default:
				console.log("Invalid option. Please choose 1-4.");
		}
	}

	rl.close();
}

main();
