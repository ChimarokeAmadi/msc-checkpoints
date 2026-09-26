# Clean Code: Chapter Summaries

## Chapter 2: Meaningful Names

Martin argues that naming is one of the most important and most neglected parts
of programming. A good name answers three questions: why the thing exists, what
it does, and how it's used. If a variable needs a comment to explain it, the
name has failed.

The chapter gives practical rules. Names should reveal intent, so
`elapsedTimeInDays` beats `d`. They should avoid disinformation, meaning you
don't call something `accountList` unless it's actually a list. They should make
meaningful distinctions instead of relying on number series like `a1, a2` or
noise words like `Data` and `Info`. They should be pronounceable, so people can
discuss them, and searchable, which rules out single letters and bare numbers
outside tiny scopes. Martin also rejects encodings like Hungarian notation and
member prefixes, which modern tools have made redundant.

He adds conventions for consistency. Classes get noun names and methods get verb
names. Pick one word per concept (don't mix `fetch`, `get`, and `retrieve`), and
avoid cute or punny names that only make sense to their author. Where it helps,
use technical terms from the solution domain, since readers are programmers, and
give names enough context to stand on their own.

**Explanation:** Code is read far more often than it's written, and names are
the first thing a reader meets. Good naming cuts the need for comments and lets
teammates understand code without asking its author. Compare
`const x = s.split('').filter(c => v.includes(c))` with
`const vowelsInWord = word.split('').filter(isVowel)`. The second one explains
itself.

## Chapter 3: Functions

The central rule is that functions should be small, and then smaller than that.
They should do one thing, do it well, and do only that. To test whether a
function does "one thing," see whether you can extract another function from it
with a name that isn't just a restatement of the code. If you can, it was doing
more than one thing.

Martin says each function should stay at a single level of abstraction.
High-level policy shouldn't sit next to low-level string manipulation. He
describes the "stepdown rule," where code reads top to bottom like a narrative
and each function leads into the more detailed ones below it. Switch statements,
which naturally do many things, should be buried in a single low-level place,
ideally behind polymorphism.

On arguments, fewer is better. Zero is ideal, one or two is fine, and three or
more needs strong justification. Boolean "flag" arguments are a warning sign
because they announce that the function does two things. Functions should have
no hidden side effects. They should follow command-query separation, meaning a
function either does something or answers something, never both. Errors should
be signalled with exceptions rather than returned error codes, and try/catch
blocks should be pulled out into their own functions. Throughout, Martin
stresses eliminating duplication. He also admits that nobody writes clean
functions on the first pass: you write a rough version, then refactor it.

**Explanation:** Small, single-purpose functions are easier to name, test,
reuse, and debug. When something breaks, a 5-line function is far easier to
reason about than a 200-line one. The chapter's lasting lesson is that
refactoring isn't optional polish. It's how clean code actually gets made.

## Chapter 4: Comments

Martin's position is deliberately provocative: comments are at best a necessary
evil, and every comment represents a failure to express yourself in code. The
problem is that code changes while comments often don't, so over time comments
drift out of date and end up lying to the reader. The only fully reliable source
of truth is the code itself.

His first advice is to explain yourself in code. For example, instead of
commenting a complex condition, extract it into a well-named function like
`isEligibleForFullBenefits()`.

He accepts that some comments are good. These include legal notices, comments
explaining intent or the reasoning behind a non-obvious decision, warnings about
consequences (such as a slow test), TODO notes, comments that highlight why
something seemingly minor matters, and documentation for public APIs.

Most of the chapter catalogues bad comments. These include mumbling, comments
that repeat what the code says, and misleading comments. It also covers comments
mandated by rules for every function, change logs that version control already
tracks, and noise like closing-brace markers and banner dividers. Martin is
especially harsh on commented-out code, which clutters files and which nobody
dares delete. Version control remembers it, so delete it.

**Explanation:** The goal isn't "never comment" but "don't use comments to
excuse unclear code." If you feel the urge to write a comment, first try
renaming or restructuring so it's no longer needed. Save comments for the _why_
that code can't express, not the _what_ that it already shows.

## Chapter 6: Objects and Data Structures

This chapter draws a sharp distinction that many programmers blur. **Objects**
hide their data behind abstractions and expose behaviour through functions.
**Data structures** expose their data and have no meaningful behaviour. Martin
argues that adding getters and setters to every private field doesn't create
abstraction. Real abstraction means exposing an interface that lets users work
with the _essence_ of the data without knowing how it's stored.

He then describes an important trade-off he calls data/object anti-symmetry.
With procedural code built on data structures, it's easy to add new functions
without changing existing structures but hard to add new data types, because
every function must change. With object-oriented code, it's easy to add new
classes without changing existing functions but hard to add new behaviours,
because every class must change. Neither approach is always better. Mature
programmers pick whichever fits the kind of change they expect.

The chapter introduces the **Law of Demeter**: a method should only talk to its
immediate friends. That means its own class, objects it creates, its arguments,
and its instance variables, not objects returned by those. Chains like
`ctxt.getOptions().getScratchDir().getAbsolutePath()` (so-called "train wrecks")
reveal too much about internal structure. Martin warns against hybrids that are
half object and half data structure, getting the disadvantages of both. He
treats simple data transfer objects (DTOs) as legitimate data structures when
that's genuinely all you need.

**Explanation:** Many poorly designed systems come from not deciding whether
something is an object or a data structure. Knowing the difference, and when
each one fits, helps students design classes that are easier to extend and less
tightly coupled to each other's internals.

## Overall Takeaway

Across all four chapters, Martin's message is that clean code communicates.
Names should tell the reader what things are. Functions should do one clear
thing at one level of abstraction. Comments should explain only what the code
truly can't. Classes should hide their internals behind meaningful interfaces.
Together, these habits produce code that a team can read, trust, and change
safely.
