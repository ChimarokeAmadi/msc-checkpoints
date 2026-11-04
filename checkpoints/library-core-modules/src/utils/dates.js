// Date helpers and clocks.
//
// The services never call "new Date()" themselves. They ask an injected clock
// for the time. In the real app that's systemClock; in tests and the demo it's a
// fixed clock we can move forward, so "14 days later" takes no time at all.

export const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). Partial days count as a full day. */
export function daysBetween(from, to) {
  return Math.ceil((to.getTime() - from.getTime()) / DAY_MS);
}

/** "2026-11-04" */
export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/** The real clock */
export const systemClock = Object.freeze({
  now: () => new Date(),
});

/** A clock that only moves when you tell it to */
export function createFixedClock(start) {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    set(date) {
      current = new Date(date);
    },
    advanceDays(days) {
      current = addDays(current, days);
    },
  };
}
