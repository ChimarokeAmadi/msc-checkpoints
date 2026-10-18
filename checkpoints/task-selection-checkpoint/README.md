# Delivery Task Selection: Brute Force vs Greedy

The goal is to select the maximum number of non-overlapping delivery tasks for a single driver. A task that ends at time *t* and a task that starts at time *t* do not overlap.

Run the code with:

```bash
node scheduler.js
```

## 1–2. Implementation and results

- **Brute force** (`bruteForce`): for each task, it tries both taking it and skipping it, and keeps the largest valid combination. A task is only taken if it starts after the last taken task ends.
- **Greedy** (`greedy`): sorts the tasks by end time, then takes every task that starts after the last taken task ends.

**Sample input:** both algorithms select 4 tasks, `[1-3] [4-6] [6-7] [8-10]`. To check that the two always agree, the script also compares them on 1,000 random inputs of up to 15 tasks each. They gave the same count every time.

**10,000 random tasks:**

| Algorithm | Result |
|---|---|
| Greedy | about 3,550 tasks selected in **about 2 ms** |
| Brute force | **crashed**: call stack overflow (recursion too deep) |

Brute force cannot handle 10,000 tasks at all. The table below shows how its running time grows on inputs small enough for it to finish. The exact times vary from run to run.

| Tasks | Brute force | Greedy |
|---|---|---|
| 10 | ~0 ms | ~0.01 ms |
| 20 | ~2 ms | ~0.01 ms |
| 25 | ~20 ms | ~0.01 ms |
| 30 | **~1,000 ms** | ~0.01 ms |

## 3. Comparison

**Greedy is far faster for large inputs.** It sorts the tasks once, in O(n log n) time, then scans them once, in O(n) time. Brute force has to try every combination of tasks, which takes O(2ⁿ) time: each extra task roughly doubles the work. At 30 tasks brute force already takes about a second. At 10,000 tasks it could never finish, and in practice it crashes before it gets the chance.

**Greedy is also easier to maintain and scale.** It is about ten lines long, has no recursion, and its running time is predictable. Brute force needs recursion, backtracking and a time limit to stay safe, and its running time can explode depending on the input.

**Memory:** greedy uses O(n) memory for a sorted copy of the tasks. Brute force also uses only O(n) memory, for the recursion and the current combination. Its problem is that recursion depth grows with the number of tasks, so on large inputs it runs out of call stack and crashes. In other words, brute force fails on stack space long before it fails on total memory.

## 4. Recommendation: Greedy

**Use the greedy algorithm in the final system.**

- **Performance:** it handles 10,000 tasks in a couple of milliseconds, so thousands of requests per second are realistic.
- **Correctness:** it is not a shortcut that only works most of the time. Picking the task that ends earliest is proven to give the best possible answer for this problem. The tests confirm that it matches brute force on every input checked.
- **Clarity:** the code is short and easy to read, test and maintain.

**When brute force is still useful:**

- **As a test reference.** On small inputs, it checks that greedy is correct, which is how it is used in `scheduler.js`.
- **When the problem changes.** Greedy only works because every task is worth the same. If tasks had different values, such as payment, distance or priority, and the goal became the most valuable schedule rather than the most tasks, greedy would no longer be correct. In that case, brute force works for very small inputs. A better solution for real use would be a dynamic programming algorithm known as *weighted interval scheduling*, which runs in O(n log n).

## 5. Bonus: stress tests

| Case | Greedy | Brute force |
|---|---|---|
| All overlapping (10,000 tasks) | 1 task, <1 ms | Crashed: call stack overflow |
| Non-overlapping (20 tasks) | 20 tasks, ~0 ms | 20 tasks, ~12 ms |
| Non-overlapping (10,000 tasks) | 10,000 tasks, <1 ms | Crashed: call stack overflow |
| Same start/end times (8 tasks) | 4 tasks | 4 tasks |

**Observations:**

- **Greedy never breaks.** It gives the correct answer in about the same short time for every case.
- **Brute force breaks in two ways:**
  - **Time:** non-overlapping tasks are its worst case, because every combination is valid and must be checked. Even 20 tasks take about 12 ms, and each additional task roughly doubles that.
  - **Stack space:** the recursion goes one level deeper per task, so any input with thousands of tasks crashes. This happens even with all-overlapping tasks, where the search itself would be quick.
- **Same start or end times work correctly in both.** A task can start exactly when the previous one ends. Duplicate tasks never produce two picks for the same time slot.
