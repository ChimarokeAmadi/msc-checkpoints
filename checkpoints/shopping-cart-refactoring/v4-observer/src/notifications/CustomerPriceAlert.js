// ===================== Observer Pattern: an observer =====================
// One customer's alert. When the PriceWatcher calls update(), it writes the
// message and sends it through the customer's channel.

import { formatAmount, formatMoney } from '../money.js';

export class CustomerPriceAlert {
  constructor(customer, channel) {
    this.customer = customer;
    this.channel = channel;
  }

  update({ product, oldPrice, newPrice }) {
    const message = `Hi ${this.customer.name}, ${product.name} dropped from ${formatAmount(oldPrice)} to ${formatMoney(newPrice)}!`;
    this.channel.send(this.customer, message);
  }
}
