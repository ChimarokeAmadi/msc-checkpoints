// Turns a normal YouTube link into an embed link that works inside an <iframe>.
//   https://www.youtube.com/watch?v=abc123 -> https://www.youtube.com/embed/abc123
//   https://youtu.be/abc123                -> https://www.youtube.com/embed/abc123
// Links that are already embed links are returned unchanged.
// Returns '' if the link isn't a YouTube link.
export function toEmbedUrl(link) {
  if (!link) return '';

  try {
    const url = new URL(link.trim());
    const host = url.hostname.replace('www.', '');

    if (host === 'youtube.com' && url.pathname.startsWith('/embed/')) {
      return url.href;
    }
    if (host === 'youtube.com' && url.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${url.searchParams.get('v')}`;
    }
    if (host === 'youtu.be' && url.pathname.length > 1) {
      return `https://www.youtube.com/embed${url.pathname}`;
    }
  } catch {
    // not a valid URL
  }

  return '';
}
