// const http = require("http");

// const server = http
// 	.createServer((request, response) => {
// 		console.log("request coming");
// 		response.write("<h1>Welcome</h1>");
// 		response.end(" Roke");
// 		// console.log(response);
// 	})
// 	.listen(3000);

// HTTP Server
const http = require("http");
http
	.createServer(function (req, res) {
		res.write("<h1>Hello</h1>");
		res.end("<h1>World</h1>");
	})
	.listen(3000);

// EXPRESS Server
const express = require("express");

const app = express();
app.get("/", (req, res) => {
	res.end("<h1>Home Page</h1>");
});

app.get("/about", (req, res) => {
	res.end("<h1>About Page</h1>");
});

app.listen(8000);
