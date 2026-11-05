// All the shop's settings in one place

export const CURRENCY = 'TND';
export const TAX_RATE = 0.19;

export const MEMBER_DISCOUNT_RATES = Object.freeze({ student: 0.1, vip: 0.15, regular: 0 });

export const COUPONS = Object.freeze({
  SAVE10: { amount: 10, minimum: 50 },
});

export const SHIPPING = Object.freeze({
  freeAbove: 100,
  lightMaxKg: 1,
  lightPrice: 4.5,
  standardMaxKg: 5,
  standardPrice: 8,
  pricePerExtraKg: 1.5,
});
