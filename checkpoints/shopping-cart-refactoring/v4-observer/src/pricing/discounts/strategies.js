// ===================== Strategy Pattern: discounts =====================
// Every discount is an object with the same method:
//
//   apply(amount, context) -> { discount, message? }
//
// "amount" is what the customer would pay so far, "context" has the cart and customer.
// The calculator doesn't know which discounts exist. It just calls apply() on each one.
// A new kind of discount = a new class here. No if/else to edit anywhere.

import { formatAmount } from '../../money.js';

const NO_DISCOUNT = Object.freeze({ discount: 0 });

/** Takes a percentage off, e.g. 10% for students */
export class PercentageDiscount {
  constructor(rate, label = `${rate * 100}% off`) {
    this.rate = rate;
    this.label = label;
  }

  apply(amount) {
    return { discount: amount * this.rate };
  }
}

/** A coupon worth a fixed amount, only if the amount reaches a minimum */
export class FixedAmountCoupon {
  constructor({ code, amount, minimum = 0 }) {
    this.code = code;
    this.amount = amount;
    this.minimum = minimum;
    this.label = `coupon ${code}`;
  }

  apply(currentAmount) {
    if (currentAmount < this.minimum) {
      return { discount: 0, message: `Coupon ${this.code} needs ${formatAmount(this.minimum)} after member discount` };
    }
    return { discount: this.amount };
  }
}

/** Percentage off only the items of one category, e.g. 20% off electronics */
export class CategoryDiscount {
  constructor({ category, rate }) {
    this.category = category;
    this.rate = rate;
    this.label = `${rate * 100}% off ${category}`;
  }

  apply(_amount, { cart }) {
    const categoryTotal = cart.lines
      .filter(({ product }) => product.category === this.category)
      .reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
    return { discount: categoryTotal * this.rate };
  }
}

/** Buy N or more items in total and get a percentage off */
export class BulkDiscount {
  constructor({ minItems, rate }) {
    this.minItems = minItems;
    this.rate = rate;
    this.label = `${rate * 100}% off for ${minItems}+ items`;
  }

  apply(amount, { cart }) {
    const itemCount = cart.lines.reduce((sum, { quantity }) => sum + quantity, 0);
    return itemCount >= this.minItems ? { discount: amount * this.rate } : NO_DISCOUNT;
  }
}

/** The "do nothing" strategy, so callers never need to check for null */
export class NoDiscount {
  label = 'no discount';

  apply() {
    return NO_DISCOUNT;
  }
}
