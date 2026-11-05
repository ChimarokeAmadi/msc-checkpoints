// Stores the products, finds them by name, and changes prices.
// v4: after a price change it tells the injected PriceWatcher (the Observer subject).
// The Catalog doesn't know anything about customers or emails anymore.

import { ProductNotFoundError } from '../errors.js';
import { PriceWatcher } from '../notifications/PriceWatcher.js';

export class Catalog {
  #products = new Map();

  constructor({ priceWatcher = new PriceWatcher() } = {}) {
    this.priceWatcher = priceWatcher;
  }

  add(product) {
    this.#products.set(product.name, product);
    return product;
  }

  find(name) {
    const product = this.#products.get(name);
    if (!product) throw new ProductNotFoundError(name);
    return product;
  }

  changePrice(name, newPrice) {
    const product = this.find(name);
    const oldPrice = product.changePrice(newPrice);
    this.priceWatcher.priceChanged(product, oldPrice);
    return product;
  }
}
