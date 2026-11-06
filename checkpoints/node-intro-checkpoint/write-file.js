// Task 3 (part 1): create "welcome.txt" containing one line: Hello Node
// Run with: node write-file.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'welcome.txt');

// writeFileSync creates the file (or replaces it if it already exists)
fs.writeFileSync(filePath, 'Hello Node\n', 'utf8');

console.log(`Created ${path.basename(filePath)}`);
