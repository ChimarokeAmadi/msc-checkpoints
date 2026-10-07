const express = require("express");

// create server
const app = express();

app.listen(80, function () {
	console.log("The app is running on localhost");
});

app.all("*any", function (req, res, next) {
	console.log("Method: " + req.method, "\nURL: " + req.url);
	// res.end("from middleware");
	next();
});

app.get("/", function (req, res) {
	console.log(req.method);
	console.log(req.url);
	res.end("hello");
});

app.get("/about", function (req, res) {
	console.log(req.url);
	res.end("About Page");
});
