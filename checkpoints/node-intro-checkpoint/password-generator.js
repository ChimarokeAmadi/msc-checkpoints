// Task 4: generate random passwords with the "generate-password" package
// Install first: npm install generate-password
// Run with: node password-generator.js       -> one 16-character password
//           node password-generator.js 24 3  -> three 24-character passwords

const generator = require('generate-password');

function generatePassword(length = 16) {
  return generator.generate({
    length,
    numbers: true, // include 0-9
    symbols: true, // include things like ! @ # $
    uppercase: true,
    lowercase: true,
    excludeSimilarCharacters: true, // no confusing pairs like l/1 or O/0
    strict: true, // at least one character from every group above
  });
}

const length = Number(process.argv[2]) || 16;
const count = Number(process.argv[3]) || 1;

if (length < 4) {
  console.error('The length must be at least 4 (one of each: number, symbol, upper, lower).');
  process.exit(1);
}

for (let i = 0; i < count; i++) {
  console.log(generatePassword(length));
}
