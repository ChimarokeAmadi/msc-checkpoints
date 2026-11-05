// Price drop alerts. Still TIGHTLY COUPLED: this function has to know every
// channel (email, sms) and is called directly by the Shop when a price changes.
// (Replaced by the Observer pattern in v4.)

import { formatAmount, formatMoney } from '../money.js';

export function sendPriceDropAlerts(customers, product, oldPrice, output) {
  if (product.price >= oldPrice) return;

  for (const customer of customers.filter((c) => c.isWatching(product.name))) {
    const message = `Hi ${customer.name}, ${product.name} dropped from ${formatAmount(oldPrice)} to ${formatMoney(product.price)}!`;
    if (customer.preferredChannel === 'email') {
      output.log(`[EMAIL to ${customer.email}] ${message}`);
    } else if (customer.preferredChannel === 'sms') {
      output.log(`[SMS to ${customer.phone}] ${message}`);
    }
  }
}
