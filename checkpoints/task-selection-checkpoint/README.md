# Delivery Task Selection: Brute Force vs Greedy

For this checkpoint I wrote two ways of choosing the most delivery tasks a single driver can do without any of them overlapping. In my code, if one task ends at 6 and another starts at 6, I count them as not overlapping, since the driver can finish one and start the next. You can run everything with `node scheduler.js`.

## The two solutions

The brute force version goes through the tasks one by one and tries both options for each one: taking it or skipping it. It only takes a task if it starts after the last task it took has ended. It keeps track of the biggest set of tasks it finds and returns that at the end.

The greedy version sorts the tasks by end time first. Then it goes down the list and takes any task that starts after the last one it picked has finished. The idea is that picking the task that finishes earliest leaves the most time free for the rest.

## Results

On the sample input, both versions picked 4 tasks: [1-3], [4-6], [6-7] and [8-10]. I didn't want to rely on just one example, so I also made 1,000 small random lists of tasks and checked that greedy got the same number as brute force every time, and it did.

For the large test I generated 10,000 random tasks. Greedy finished in about 2 milliseconds. Brute force didn't finish at all. It crashed with a "Maximum call stack size exceeded" error, because the recursion goes one level deeper for every task and JavaScript can't go 10,000 levels deep. So to see how slow it gets, I ran it on smaller lists. With 20 tasks it took about 2 ms, with 25 tasks about 20 ms, and with 30 tasks about a whole second. Greedy stayed under a millisecond for all of these. The times change a little each time I run it, but the pattern is always the same.

## Comparing the two

Greedy is much faster on large inputs. All it does is sort the list once (O(n log n)) and then go through it once (O(n)). Brute force has to look at every possible combination of tasks, which is O(2ⁿ), so every extra task roughly doubles the amount of work. That's why it went from 20 ms to a full second with only 5 more tasks.

Greedy is also easier to maintain. It's about ten lines, there's no recursion, and it always takes about the same time to run. The brute force code is longer, harder to follow, and I had to add a time limit and catch the crash just to stop it from breaking the program.

For memory, both of them only need O(n) extra space. Greedy makes a sorted copy of the tasks, and brute force keeps the current combination plus the recursion. The problem with brute force is that the recursion depth grows with the number of tasks, so it ran out of call stack space long before it ran out of actual memory.

## My recommendation

I would use the greedy algorithm for the real system. It handled 10,000 tasks in a couple of milliseconds, so thousands of requests per second should be fine. It's also not just a fast guess. Picking the task that ends earliest is known to always give the best answer for this problem, and my tests agreed with that. And the code is short enough that someone else on the team could read it and understand it quickly.

Brute force is still useful in a couple of situations. I used it to check that greedy was giving the right answers on small inputs, and that's a good way to keep using it, as a test. It would also matter if the problem changed. Greedy only works here because every task counts the same. If tasks had different values, like how much each delivery pays, and the goal was to earn the most instead of doing the most tasks, greedy wouldn't always be right anymore. Brute force would still work for a handful of tasks, but for a real system I'd look into a dynamic programming approach called weighted interval scheduling instead.

## Bonus: stress tests

I tried four edge cases. When all 10,000 tasks overlapped each other, greedy correctly picked just 1 task in under a millisecond, but brute force crashed from the stack overflow again. When none of the tasks overlapped, greedy picked all of them, both for 20 tasks and for 10,000. Brute force got all 20 right on the small one, but it took about 12 ms, which is a lot for 20 tasks. That's because when nothing overlaps, every single combination is valid and it has to check them all. On the 10,000 non-overlapping tasks it crashed.

For tasks that share the same start or end times, I made a small list with some duplicates and some tasks that start exactly when others end. Both versions got the right answer of 4 tasks.

Overall, greedy never had a problem with any of the cases. Brute force breaks in two ways: it gets too slow when lots of combinations are possible, and it crashes as soon as the list gets into the thousands, no matter what the tasks look like.
