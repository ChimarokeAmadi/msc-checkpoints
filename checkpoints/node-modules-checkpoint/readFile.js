// Task 1: using a BUILT-IN module (fs)
// Built-in modules come with Node.js, so there's nothing to install.
// Run with: node readFile.js

const fs = require('fs');
const path = require('path'); // also built-in: builds a path that works on every OS

// __dirname = the folder this file is in, so it works from any terminal location
const filePath = path.join(__dirname, 'message.txt');

try {
  // readFileSync waits until the whole file is read, then returns its content.
  // 'utf8' turns the raw bytes into text (without it we'd get a Buffer).
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(content.trim());
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`File not found: ${filePath}`);
  } else {
    console.error(`Could not read the file: ${error.message}`);
  }
  process.exitCode = 1;
}
