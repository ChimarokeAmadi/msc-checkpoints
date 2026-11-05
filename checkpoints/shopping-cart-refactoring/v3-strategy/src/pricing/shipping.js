// Shipping rules, in one place (in v0 they were copied in two functions)

import { SHIPPING } from '../config.js';

export function calculateShipping(discountedTotal, weightKg, rules = SHIPPING) {
  if (discountedTotal >= rules.freeAbove) return 0;
  if (weightKg <= rules.lightMaxKg) return rules.lightPrice;
  if (weightKg <= rules.standardMaxKg) return rules.standardPrice;
  return rules.standardPrice + (weightKg - rules.standardMaxKg) * rules.pricePerExtraKg;
}
