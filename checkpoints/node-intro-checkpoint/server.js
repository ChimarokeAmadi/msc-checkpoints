// Task 2: a web server on port 3000
// Run with: node server.js   then open http://localhost:3000
// Stop it with Ctrl + C

const http = require('http'); // built-in module, nothing to install

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Tell the browser we are sending HTML so it shows a heading, not plain text
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Hello Node!!!!</h1>\n');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
