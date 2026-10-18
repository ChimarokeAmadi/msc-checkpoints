Mac:printer-queue-checkpoint chimarokeamadi$ node printer-queue.js =====
Employees send print jobs ===== Added: "Alice - Quarterly Report" (12 pages)
Added: "Bob - Meeting Notes" (3 pages) Added: "Chioma - Invoice" (1 page) Added:
"David - Presentation Slides" (20 pages)

===== Current queue ===== Print queue (next job first):

1. "Alice - Quarterly Report" - 12 pages
2. "Bob - Meeting Notes" - 3 pages
3. "Chioma - Invoice" - 1 page
4. "David - Presentation Slides" - 20 pages Next up: "Alice - Quarterly Report"

===== Printer processes two jobs ===== Printing: "Alice - Quarterly Report" (12
pages)... done. Printing: "Bob - Meeting Notes" (3 pages)... done.

===== Queue after processing two jobs ===== Print queue (next job first):

1. "Chioma - Invoice" - 1 page
2. "David - Presentation Slides" - 20 pages

===== A new job arrives while printing ===== Added: "Emeka - Contract" (5 pages)
Print queue (next job first):

1. "Chioma - Invoice" - 1 page
2. "David - Presentation Slides" - 20 pages
3. "Emeka - Contract" - 5 pages

===== Printer processes the rest ===== Printing: "Chioma - Invoice" (1 page)...
done. Printing: "David - Presentation Slides" (20 pages)... done. Printing:
"Emeka - Contract" (5 pages)... done.

===== Queue at the end ===== Print queue is empty. No jobs to print.

===== Invalid jobs ===== Job not added: a job needs a name. Job "Frank - Memo"
not added: pages must be a whole number above 0. Job "Grace - Poster" not added:
pages must be a whole number above 0.

===== Tests ===== PASS: peek returns the first job without removing it PASS:
jobs are printed in the order they arrived (FIFO) PASS: queue is empty after all
jobs are printed PASS: processing an empty queue returns null PASS: invalid jobs
are rejected

5 passed, 0 failed Mac:printer-queue-checkpoint chimarokeamadi$
