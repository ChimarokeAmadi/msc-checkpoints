// One customer's cart. It knows its lines and can total them up.

import { OutOfStockError } from '../errors.js';

export class Cart {
  #lines = []; // { product, quantity }

  constructor(customer) {
    this.customer = customer;
  }

  add(product, quantity) {
    const line = this.#lines.find((l) => l.product === product);
    const alreadyInCart = line ? line.quantity : 0;

    if (!product.hasStock(alreadyInCart + quantity)) {
      throw new OutOfStockError(this.customer.name, product);
    }

    if (line) line.quantity += quantity;
    else this.#lines.push({ product, quantity });
  }

  get lines() {
    return this.#lines.map((line) => ({ ...line }));
  }

  get isEmpty() {
    return this.#lines.length === 0;
  }

  subtotal() {
    return this.#lines.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  }

  weightKg() {
    return this.#lines.reduce((sum, { product, quantity }) => sum + product.weightKg * quantity, 0);
  }

  clear() {
    this.#lines = [];
  }
}
