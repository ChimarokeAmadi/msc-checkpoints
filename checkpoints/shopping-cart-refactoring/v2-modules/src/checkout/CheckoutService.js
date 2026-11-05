// Checkout: price the cart, show the receipt, update the stock, empty the cart

import { formatReceipt } from './receipt.js';

export class CheckoutService {
  constructor({ calculator, output }) {
    this.calculator = calculator;
    this.output = output;
  }

  checkout(cart, couponCode) {
    if (cart.isEmpty) {
      this.output.log('Cart is empty');
      return null;
    }

    const totals = this.calculator.calculate(cart, couponCode);
    formatReceipt(cart, totals).forEach((line) => this.output.log(line));

    for (const { product, quantity } of cart.lines) {
      product.reduceStock(quantity);
    }
    cart.clear();
    return totals;
  }
}
