// Stores the products and finds them by name

import { ProductNotFoundError } from '../errors.js';

export class Catalog {
  #products = new Map();

  add(product) {
    this.#products.set(product.name, product);
    return product;
  }

  find(name) {
    const product = this.#products.get(name);
    if (!product) throw new ProductNotFoundError(name);
    return product;
  }
}
