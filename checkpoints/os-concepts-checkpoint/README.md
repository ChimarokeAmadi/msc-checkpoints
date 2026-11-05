# Operating System Concepts Checkpoint

This checkpoint simulates how an operating system manages several tasks: CPU scheduling (FCFS and Round Robin), synchronization of a shared counter (a mutex), page replacement (FIFO and LRU) and disk scheduling (FCFS and SSTF).

The deliverable is **[OS-Concepts-Checkpoint.pdf](OS-Concepts-Checkpoint.pdf)**. It has the answers, the Gantt charts, the frame tables, the head movement charts, all the calculations and the explanations.

## Results

| Part | Result |
|---|---|
| 1. CPU scheduling | Average waiting time: FCFS 3.33, Round Robin (q=2) 3.33. Round Robin is more responsive (average response time 1 vs 3.33). |
| 2. Synchronization | Without a lock the counter ended between 109 and 120 in my simulated runs. With a mutex it's always 200. |
| 3. Page replacement | FIFO 6 faults, LRU 6 faults (Optimal would be 5). It's a tie for this string, but LRU is better in general. |
| 4. Disk scheduling | FCFS 640 tracks, SSTF 236 tracks. SSTF is about 63% more efficient. |

## How I checked the answers

I first worked everything out by hand. Then I wrote `simulations.js`, which runs each algorithm and prints the step-by-step tables, to make sure my numbers were right. The report is generated from the same code by `build-report.js`, so every number and chart in the PDF comes from the simulation and none of them are typed in by hand.

```bash
node simulations.js     # prints all the simulations in the terminal
node build-report.js    # rebuilds report.html
```

`report.html` is the same report as a web page. To make the PDF again after a change, open it in a browser and use Print → Save as PDF.

For Round Robin there's a choice to make when a process arrives at the same moment another one's quantum ends. I used the usual convention (the new arrival joins the queue first). The report also mentions what happens with the other convention (an average waiting time of 4.00).
