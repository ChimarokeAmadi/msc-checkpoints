# Is Palindrome

A palindrome is a word that reads the same from left to right and from right to left, like gag, kayak, php or radar. In this checkpoint I wrote a recursive JavaScript function that checks whether a word is a palindrome.

## How it works

The function `isPalindrome(word)` follows the breakdown from the instructions. It compares the first and last characters of the word. If they're different, it stops straight away and returns `false`. If they're the same, it calls itself again on the rest of the word, which is the word without its first and last characters (`word.slice(1, -1)`). The stop condition is when the word has 0 or 1 characters left. An empty word or a single letter is always a palindrome, so it returns `true`.

For example, with "kayak": `k` and `k` are equal, so it tests "aya". Then `a` and `a` are equal, so it tests "y". "y" has one character, so it's a palindrome. With "hello", `h` and `o` are different, so it stops at the first step.

I also wrote `isPalindromeVerbose`, which does the same thing but prints each step, so you can see the recursion going deeper.

The comparison is case sensitive, so "Radar" isn't a palindrome, because `R` and `r` are different characters. To ignore case, call `isPalindrome(word.toLowerCase())`.

## How to run it

```bash
node palindrome.js
```

This shows the steps for "kayak" and then tests a list of example words. You can also test your own words:

```bash
node palindrome.js level hello abba
```
