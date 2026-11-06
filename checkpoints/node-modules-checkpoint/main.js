// Task 2: using our local module
// The "./" tells Node it's our own file (not a built-in or an npm package).
// Run with: node main.js

const { generateReport } = require('./reportGenerator');

const students = [
  { name: 'Amara', scores: [14, 12.5, 16, 11] },
  { name: 'Tunde', scores: [8, 9.5, 11, 7] },
  { name: 'Bello', scores: [10, 10, 10] }, // exactly 10: passes
];

for (const { name, scores } of students) {
  console.log(generateReport(name, scores));
  console.log();
}

// Bad data gives a clear error instead of a wrong report
try {
  generateReport('Ghost', [12, 25]);
} catch (error) {
  console.log(`Could not create the report: ${error.message}`);
}
