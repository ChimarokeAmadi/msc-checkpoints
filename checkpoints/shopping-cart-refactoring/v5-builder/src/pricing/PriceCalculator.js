// Puts the pricing steps together: subtotal -> discounts -> shipping -> tax -> total.
// v3: the discount step is now a DiscountPolicy made of Strategy objects.

import { TAX_RATE } from '../config.js';
import { DiscountPolicy } from './discounts/DiscountPolicy.js';
import { calculateShipping } from './shipping.js';

export class PriceCalculator {
  constructor({ discountPolicy = new DiscountPolicy(), shipping = calculateShipping, taxRate = TAX_RATE } = {}) {
    this.discountPolicy = discountPolicy;
    this.shipping = shipping;
    this.taxRate = taxRate;
  }

  calculate(cart, couponCode) {
    const subtotal = cart.subtotal();
    const { discount, discountedTotal, messages } = this.discountPolicy.apply(subtotal, cart, couponCode);
    const shipping = this.shipping(discountedTotal, cart.weightKg());
    const tax = discountedTotal * this.taxRate;
    return { subtotal, discount, shipping, tax, total: discountedTotal + tax + shipping, messages };
  }
}
