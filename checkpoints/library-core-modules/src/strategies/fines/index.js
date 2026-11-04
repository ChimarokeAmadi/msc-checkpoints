// ===================== Strategy Pattern: fines =====================
// Each class is a different way of calculating a late fine. They all have the
// same two methods (the FineStrategy interface), so LoanService can use any of
// them without knowing which one it has. Changing the fine rules means passing
// in a different strategy, not editing LoanService.

import { requireNonNegativeNumber } from '../../utils/validation.js';
import { FineStrategy } from '../../interfaces/index.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** No fine at all (e.g. for staff) */
export class NoFineStrategy {
  calculate() {
    return 0;
  }

  describe() {
    return 'no late fines';
  }
}

/** A fixed amount per day late, optionally capped */
export class DailyFineStrategy {
  #ratePerDay;
  #maxFine;

  constructor({ ratePerDay, maxFine = Infinity }) {
    this.#ratePerDay = requireNonNegativeNumber(ratePerDay, 'ratePerDay');
    this.#maxFine = maxFine;
  }

  calculate(daysLate) {
    if (daysLate <= 0) return 0;
    return round2(Math.min(daysLate * this.#ratePerDay, this.#maxFine));
  }

  describe() {
    const cap = Number.isFinite(this.#maxFine) ? `, max $${this.#maxFine.toFixed(2)}` : '';
    return `$${this.#ratePerDay.toFixed(2)} per day${cap}`;
  }
}

/**
 * Different rates for different periods, e.g.
 *   first 7 days: $0.10/day, after that: $0.50/day
 * tiers: [{ upToDay: 7, ratePerDay: 0.1 }, { upToDay: Infinity, ratePerDay: 0.5 }]
 */
export class TieredFineStrategy {
  #tiers;

  constructor(tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) throw new TypeError('tiers must be a non-empty array');
    this.#tiers = [...tiers].sort((a, b) => a.upToDay - b.upToDay);
  }

  calculate(daysLate) {
    let total = 0;
    let counted = 0;
    for (const { upToDay, ratePerDay } of this.#tiers) {
      if (counted >= daysLate) break;
      const daysInTier = Math.min(daysLate, upToDay) - counted;
      total += daysInTier * ratePerDay;
      counted += daysInTier;
    }
    return round2(total);
  }

  describe() {
    let from = 1;
    return this.#tiers
      .map(({ upToDay, ratePerDay }) => {
        const range = Number.isFinite(upToDay) ? `days ${from}-${upToDay}` : `day ${from}+`;
        from = upToDay + 1;
        return `${range}: $${ratePerDay.toFixed(2)}/day`;
      })
      .join(', ');
  }
}

/**
 * Wraps another strategy and ignores the first few days late.
 * (This is also the Decorator pattern: it adds behaviour to any FineStrategy.)
 */
export class GracePeriodFineStrategy {
  #graceDays;
  #inner;

  constructor({ graceDays, inner }) {
    this.#graceDays = requireNonNegativeNumber(graceDays, 'graceDays');
    this.#inner = FineStrategy.assert(inner, 'inner');
  }

  calculate(daysLate, loan) {
    return this.#inner.calculate(daysLate - this.#graceDays, loan);
  }

  describe() {
    return `${this.#graceDays} grace day(s), then ${this.#inner.describe()}`;
  }
}
