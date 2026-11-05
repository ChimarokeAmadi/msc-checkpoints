// Chooses WHICH discount strategies apply to a customer, and applies them in order.
// Member discounts and coupons are just entries in two maps, so the shop can add
// a member type or a coupon by configuration, without changing any code.

import { MEMBER_DISCOUNT_RATES, COUPONS } from '../../config.js';
import { PercentageDiscount, FixedAmountCoupon, NoDiscount } from './strategies.js';

export function defaultMemberDiscounts() {
  return Object.fromEntries(
    Object.entries(MEMBER_DISCOUNT_RATES).map(([type, rate]) => [
      type,
      rate > 0 ? new PercentageDiscount(rate, `${type} discount`) : new NoDiscount(),
    ])
  );
}

export function defaultCoupons() {
  return Object.fromEntries(
    Object.entries(COUPONS).map(([code, rule]) => [code, new FixedAmountCoupon({ code, ...rule })])
  );
}

export class DiscountPolicy {
  constructor({ memberDiscounts = defaultMemberDiscounts(), coupons = defaultCoupons(), extraDiscounts = [] } = {}) {
    this.memberDiscounts = memberDiscounts;
    this.coupons = coupons;
    this.extraDiscounts = extraDiscounts; // e.g. a seasonal sale for everyone
  }

  /** The strategies for this checkout, in the order they're applied */
  strategiesFor(customer, couponCode) {
    return [
      this.memberDiscounts[customer.memberType] ?? new NoDiscount(),
      ...this.extraDiscounts,
      ...(this.coupons[couponCode] ? [this.coupons[couponCode]] : []),
    ];
  }

  /** Applies each strategy to what's left after the previous ones */
  apply(subtotal, cart, couponCode) {
    let discountedTotal = subtotal;
    let discount = 0;
    const messages = [];

    for (const strategy of this.strategiesFor(cart.customer, couponCode)) {
      const result = strategy.apply(discountedTotal, { cart, customer: cart.customer });
      discount += result.discount;
      discountedTotal -= result.discount;
      if (result.message) messages.push(result.message);
    }
    return { discount, discountedTotal, messages };
  }
}
