// Turns DESIGN.md into diagrams.html, a page that shows the whole document
// with the Mermaid diagrams drawn, so it can be opened in any browser
// (or printed / saved as PDF).
// Run it again after editing DESIGN.md:  node build-html.js

import fs from 'node:fs';

const markdown = fs.readFileSync(new URL('./DESIGN.md', import.meta.url), 'utf8');
// JSON keeps quotes and newlines safe. "<" is escaped so "</script>" can't end the script early.
const embedded = JSON.stringify(markdown).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Library System Design</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #1e293b;
           font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.6; }
    main { max-width: 980px; margin: 0 auto; padding: 32px 16px 80px; }
    h1 { color: #1d4ed8; }
    h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 48px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 0.95rem; display: block; overflow-x: auto; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #e2e8f0; }
    code { background: #e2e8f0; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    .mermaid { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;
               margin: 16px 0; overflow-x: auto; text-align: center; }
    a { color: #1d4ed8; }
    @media print { .mermaid { break-inside: avoid; } }
  </style>
</head>
<body>
  <main id="content">Loading…</main>

  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
  <script>
    const markdown = ${embedded};
    const content = document.getElementById('content');

    // Give headings ids so the table of contents links work
    const slug = (text) => text.toLowerCase().trim().replace(/[^\\w\\s-]/g, '').replace(/\\s+/g, '-');
    marked.use({
      renderer: {
        heading(text, level, raw) { return '<h' + level + ' id="' + slug(raw) + '">' + text + '</h' + level + '>'; },
      },
    });

    content.innerHTML = marked.parse(markdown);

    // Replace each mermaid code block with a div that Mermaid can draw
    content.querySelectorAll('pre code.language-mermaid').forEach((code) => {
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = code.textContent;
      code.parentElement.replaceWith(div);
    });

    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    mermaid.run({ querySelector: '.mermaid' });
  </script>
</body>
</html>
`;

fs.writeFileSync(new URL('./diagrams.html', import.meta.url), html);
console.log('Wrote diagrams.html');
