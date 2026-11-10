// markdown.js
// Turns the Markdown of a post into HTML. The HTML is cleaned with DOMPurify
// before it is shown, so a post (or a malicious author) can't run scripts in
// visitors' browsers, even if someone writes <script> or onerror="..." in it.

import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

// Links to other websites open in a new tab, safely
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && /^https?:\/\//.test(node.getAttribute('href') ?? '')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(text ?? ''));
}
