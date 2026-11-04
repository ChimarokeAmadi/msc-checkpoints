// Is palindrome: a recursive check
//
// Idea (from the instructions):
//   - Compare the first and last characters of the word.
//   - If they are equal, test the rest of the word (without those two characters).
//   - If they are different, stop: it's not a palindrome.
//   - Stop condition: an empty word or a word with a single character is a palindrome.
//
// Run with:  node palindrome.js            (tests a list of example words)
//      or:   node palindrome.js level hello (tests your own words)

function isPalindrome(word) {
  // Stop condition: 0 or 1 character left
  if (word.length <= 1) {
    return true;
  }

  const first = word[0];
  const last = word[word.length - 1];

  // Difference: we stop here
  if (first !== last) {
    return false;
  }

  // Equality: test the rest of the word (remove the first and last characters)
  return isPalindrome(word.slice(1, -1));
}

// Same check, but it prints every step so we can see the recursion working
function isPalindromeVerbose(word, depth = 0) {
  const indent = '  '.repeat(depth);

  if (word.length <= 1) {
    console.log(`${indent}"${word}" has ${word.length} character(s) -> palindrome (stop condition)`);
    return true;
  }

  const first = word[0];
  const last = word[word.length - 1];

  if (first !== last) {
    console.log(`${indent}"${word}": '${first}' ≠ '${last}' -> not a palindrome, stop`);
    return false;
  }

  console.log(`${indent}"${word}": '${first}' = '${last}' -> test the rest "${word.slice(1, -1)}"`);
  return isPalindromeVerbose(word.slice(1, -1), depth + 1);
}

// ---------- Demo ----------

const wordsFromCommandLine = process.argv.slice(2);
const words = wordsFromCommandLine.length > 0
  ? wordsFromCommandLine
  : ['gag', 'kayak', 'php', 'radar', 'level', 'noon', 'a', '', 'hello', 'kayaks', 'Radar'];

// Show the steps for one example
const example = wordsFromCommandLine[0] ?? 'kayak';
console.log(`Step by step for "${example}":`);
isPalindromeVerbose(example);

console.log('\nResults:');
for (const word of words) {
  const label = word === '' ? '(empty word)' : `"${word}"`;
  console.log(`  ${label.padEnd(14)} -> ${isPalindrome(word) ? 'palindrome ✅' : 'not a palindrome ❌'}`);
}

// Note: the comparison is case sensitive, so "Radar" is not a palindrome ('R' ≠ 'r').
// To ignore case, call isPalindrome(word.toLowerCase()).
