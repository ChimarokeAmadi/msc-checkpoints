// One error type for every "you can't do that" situation in the library,
// so the code using the library can catch them separately from real bugs.
export default class LibraryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LibraryError';
  }
}
