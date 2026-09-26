const http = require("http");

const server = http
	.createServer((request, response) => {
		console.log("request coming");
		response.write("<h1>Welcome</h1>");
		response.end(" Roke");
		// console.log(response);
	})
	.listen(3000);
