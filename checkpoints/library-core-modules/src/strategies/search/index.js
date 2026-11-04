// ===================== Strategy Pattern: search =====================
// Each strategy decides whether a book matches the query in its own way.
// BookService.search(query, strategy) works with any of them.

import { SearchStrategy } from '../../interfaces/index.js';

const normalise = (text) => String(text ?? '').toLowerCase().trim();

export const titleSearch = Object.freeze({
  name: 'title',
  matches: (book, query) => normalise(book.title).includes(normalise(query)),
});

export const authorSearch = Object.freeze({
  name: 'author',
  matches: (book, query) => normalise(book.author).includes(normalise(query)),
});

export const isbnSearch = Object.freeze({
  name: 'isbn',
  matches: (book, query) => book.isbn === String(query).replace(/[-\s]/g, '').toUpperCase(),
});

export const genreSearch = Object.freeze({
  name: 'genre',
  matches: (book, query) => normalise(book.genre) === normalise(query),
});

/** Combines strategies: a book matches if ANY of them match */
export function anyOf(...strategies) {
  strategies.forEach((s, i) => SearchStrategy.assert(s, `strategy #${i + 1}`));
  return Object.freeze({
    name: `anyOf(${strategies.map((s) => s.name ?? '?').join(', ')})`,
    matches: (book, query) => strategies.some((s) => s.matches(book, query)),
  });
}

/** Default "search everything" strategy */
export const keywordSearch = anyOf(titleSearch, authorSearch, isbnSearch, genreSearch);

/** Look up a strategy by name: "title", "author", "isbn", "genre", "keyword" */
export const searchStrategies = Object.freeze({
  title: titleSearch,
  author: authorSearch,
  isbn: isbnSearch,
  genre: genreSearch,
  keyword: keywordSearch,
});
