# Identify Mistakes and Fix a CV

For this checkpoint, GoMyCode gave us a CV (for "Keith Shannons", a software engineer) with 5 mistakes in it. I had to find them, explain how to fix each one, and make a corrected version.

- **`CV-Review-5-Mistakes-and-Fixes.pdf`** is my answer: the 5 mistakes, why each one matters, and the text before and after my fix. At the end there's a side-by-side picture of the old and new CV.
- **`Keith-Shannons-CV-corrected.pdf`** is the corrected CV.
- `original/original-resume.pdf` is the CV we were given.

## The 5 mistakes in short

1. **Vague achievements with no numbers.** "So many", "a high rate" and "Learned about…" don't prove anything, so I rewrote them as results with numbers.
2. **Grammar and consistency.** "Rating" should be "ratings", "Javascript" should be "JavaScript", there were two different date styles, and the education labels didn't match the rest.
3. **A broken LinkedIn link and weak contact details.** The LinkedIn address had a space in it, the email started with "hello@", and there was no location.
4. **No professional summary.** I added three sentences at the top: who Keith is, what he's good at (with proof), and what he's looking for.
5. **A skills section that was too thin.** It only listed programming languages, so I added frameworks, databases and cloud, tools and soft skills, which also helps with ATS keyword filters.

I also removed the photo and the decorative icons, and balanced the two columns.

The original CV doesn't say what Keith's real results were, so the numbers I added (like 95% satisfaction or 25% faster delivery) are examples of what he should write. On a real CV he would put his own real numbers. The 80% was already in the original.

## How I made the PDFs

I wrote both documents in HTML (`source/cv.html` and `source/review.html`) and printed them to PDF with Chrome in headless mode, so I could change the text easily and keep everything exactly on one A4 page:

```bash
"Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf=Keith-Shannons-CV-corrected.pdf source/cv.html
```
