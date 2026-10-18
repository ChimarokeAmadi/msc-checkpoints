// Recursion
// Run with: node recursion.js

// ---------- 1. Fibonacci Sequence ----------

// Base cases: fib(0) = 0, fib(1) = 1
// Recursive case: fib(n) = fib(n - 1) + fib(n - 2)
// This simple version recalculates the same numbers many times (O(2^n)),
// so it gets very slow above n = 40 or so.
function fibonacci(n) {
	if (n < 0 || !Number.isInteger(n)) {
		throw new Error("n must be a whole number that is 0 or more");
	}
	if (n <= 1) {
		return n;
	}
	return fibonacci(n - 1) + fibonacci(n - 2);
}

// Same recursion, but each result is saved in `memo` the first time it is
// calculated, so every number is only worked out once (O(n)).
function fibonacciMemo(n, memo = new Map()) {
	if (n < 0 || !Number.isInteger(n)) {
		throw new Error("n must be a whole number that is 0 or more");
	}
	if (n <= 1) {
		return n;
	}
	if (memo.has(n)) {
		return memo.get(n);
	}
	const result = fibonacciMemo(n - 1, memo) + fibonacciMemo(n - 2, memo);
	memo.set(n, result);
	return result;
}

// ---------- 2. Palindrome Checker ----------

// First remove spaces and punctuation and make everything lowercase,
// then compare the first and last characters and recurse on the middle.
function isPalindrome(text) {
	const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, "");
	return checkEnds(cleaned, 0, cleaned.length - 1);
}

function checkEnds(text, left, right) {
	// Base case: 0 or 1 characters left in the middle
	if (left >= right) {
		return true;
	}
	if (text[left] !== text[right]) {
		return false;
	}
	return checkEnds(text, left + 1, right - 1);
}

// ---------- 3. Power Function ----------

// Base case: anything to the power 0 is 1.
// Negative powers: x^-n = 1 / x^n
// Recursive case: x^n = x^(n/2) * x^(n/2), times x once more if n is odd.
// Halving the exponent each time means only about log2(n) calls,
// instead of n calls for x * x^(n - 1).
function power(base, exponent) {
	if (!Number.isInteger(exponent)) {
		throw new Error("exponent must be a whole number");
	}
	if (exponent === 0) {
		return 1;
	}
	if (exponent < 0) {
		return 1 / power(base, -exponent);
	}

	const half = power(base, Math.floor(exponent / 2));
	if (exponent % 2 === 0) {
		return half * half;
	}
	return half * half * base;
}

// ---------- Examples and tests ----------

let passed = 0;
let failed = 0;

function check(description, actual, expected) {
	const ok = actual === expected;
	if (ok) passed++;
	else failed++;
	console.log(`${ok ? "PASS" : "FAIL"}: ${description} -> ${actual}${ok ? "" : ` (expected ${expected})`}`);
}

console.log("===== Fibonacci =====");
const firstTen = [];
for (let i = 0; i < 10; i++) firstTen.push(fibonacci(i));
console.log(`First 10 numbers: ${firstTen.join(", ")}`);
check("fibonacci(0)", fibonacci(0), 0);
check("fibonacci(1)", fibonacci(1), 1);
check("fibonacci(6)", fibonacci(6), 8);
check("fibonacci(10)", fibonacci(10), 55);
check("fibonacciMemo(50)", fibonacciMemo(50), 12586269025);

console.log("\n===== Palindrome =====");
check('"racecar"', isPalindrome("racecar"), true);
check('"A man, a plan, a canal: Panama"', isPalindrome("A man, a plan, a canal: Panama"), true);
check('"Was it a car or a cat I saw?"', isPalindrome("Was it a car or a cat I saw?"), true);
check('"hello"', isPalindrome("hello"), false);
check('"" (empty string)', isPalindrome(""), true);
check('"a"', isPalindrome("a"), true);

console.log("\n===== Power =====");
check("power(2, 10)", power(2, 10), 1024);
check("power(3, 3)", power(3, 3), 27);
check("power(5, 0)", power(5, 0), 1);
check("power(2, -2)", power(2, -2), 0.25);
check("power(-2, 3)", power(-2, 3), -8);
check("power(10, 1)", power(10, 1), 10);

console.log(`\n${passed} passed, ${failed} failed`);
