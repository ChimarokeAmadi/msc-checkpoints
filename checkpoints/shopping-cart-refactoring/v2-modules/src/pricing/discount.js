// Discount rules. Still an if/else on member types and coupon codes:
// adding a new kind of discount means editing this function.
// (Replaced by the Strategy pattern in v3.)

import { MEMBER_DISCOUNT_RATES, COUPONS } from '../config.js';
import { formatAmount } from '../money.js';

/** Returns { discount, discountedTotal, messages } */
export function calculateDiscount(subtotal, memberType, couponCode) {
  const messages = [];
  let discount = subtotal * (MEMBER_DISCOUNT_RATES[memberType] ?? 0);
  let discountedTotal = subtotal - discount;

  const coupon = COUPONS[couponCode];
  if (coupon) {
    if (discountedTotal >= coupon.minimum) {
      discount += coupon.amount;
      discountedTotal -= coupon.amount;
    } else {
      messages.push(`Coupon ${couponCode} needs ${formatAmount(coupon.minimum)} after member discount`);
    }
  }
  return { discount, discountedTotal, messages };
}
