// Builds the receipt as a list of lines. It doesn't print anything itself,
// so it can be tested, shown in a web page, or emailed.

import { TAX_RATE } from '../config.js';
import { formatAmount, formatMoney } from '../money.js';

export function formatReceipt(cart, totals, taxRate = TAX_RATE) {
  const lines = [`--- Receipt for ${cart.customer.name} (${cart.customer.memberType}) ---`];

  for (const { product, quantity } of cart.lines) {
    lines.push(`${product.name} x${quantity} @ ${formatAmount(product.price)} = ${formatAmount(product.price * quantity)}`);
  }
  lines.push(`Subtotal: ${formatAmount(totals.subtotal)}`);
  lines.push(...totals.messages);
  if (totals.discount > 0) lines.push(`Discount: -${formatAmount(totals.discount)}`);
  lines.push(`Shipping: ${formatAmount(totals.shipping)}`);
  lines.push(`Tax (${taxRate * 100}%): ${formatAmount(totals.tax)}`);
  lines.push(`Total: ${formatMoney(totals.total)}`);
  return lines;
}
