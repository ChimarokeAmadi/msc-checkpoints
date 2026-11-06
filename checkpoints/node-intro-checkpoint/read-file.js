// Task 3 (part 2): read hello.txt and console.log its content
// Run with: node read-file.js            -> reads hello.txt
//           node read-file.js welcome.txt -> reads another file, e.g. the one from write-file.js

const fs = require('fs');
const path = require('path');

const fileName = process.argv[2] || 'hello.txt';
const filePath = path.join(__dirname, fileName);

// readFile is asynchronous: Node keeps working and calls us back when the file is read
fs.readFile(filePath, 'utf8', (error, data) => {
  if (error) {
    if (error.code === 'ENOENT') {
      console.error(`File not found: ${fileName}`);
    } else {
      console.error(`Could not read ${fileName}: ${error.message}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(data.trim());
});
