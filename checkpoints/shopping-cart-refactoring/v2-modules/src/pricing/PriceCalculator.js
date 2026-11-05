// Puts the pricing steps together: subtotal -> discount -> shipping -> tax -> total.
// The rules are passed in (dependency injection), so a test can swap any of them.

import { TAX_RATE } from '../config.js';
import { calculateDiscount } from './discount.js';
import { calculateShipping } from './shipping.js';

export class PriceCalculator {
  constructor({ discount = calculateDiscount, shipping = calculateShipping, taxRate = TAX_RATE } = {}) {
    this.discount = discount;
    this.shipping = shipping;
    this.taxRate = taxRate;
  }

  calculate(cart, couponCode) {
    const subtotal = cart.subtotal();
    const { discount, discountedTotal, messages } = this.discount(subtotal, cart.customer.memberType, couponCode);
    const shipping = this.shipping(discountedTotal, cart.weightKg());
    const tax = discountedTotal * this.taxRate;
    return { subtotal, discount, shipping, tax, total: discountedTotal + tax + shipping, messages };
  }
}
