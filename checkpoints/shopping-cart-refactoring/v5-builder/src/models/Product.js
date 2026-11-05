// A product. v5: products are created with the ProductBuilder:
//
//   const laptop = Product.builder('Laptop')
//     .price(1200).category('electronics').weight(2.2).stock(5)
//     .sku('LAP-001').brand('Lenovo').tags('computers', 'work')
//     .build();
//
// Before, it was new Product('Laptop', 1200, 'electronics', 2.2, 5): five positional
// arguments that were easy to mix up (is 2.2 the weight or the stock?), and every new
// optional field would have made it longer.

import { ProductBuilder } from './ProductBuilder.js';

export class Product {
  #price;
  #stock;

  /** Use Product.builder(name) instead of calling this directly */
  constructor(spec) {
    this.name = spec.name;
    this.category = spec.category;
    this.weightKg = spec.weightKg;
    this.sku = spec.sku;
    this.brand = spec.brand;
    this.description = spec.description;
    this.tags = Object.freeze([...spec.tags]);
    this.#price = spec.price;
    this.#stock = spec.stock;
    Object.freeze(this);
  }

  static builder(name) {
    return new ProductBuilder(name, (spec) => new Product(spec));
  }

  get price() {
    return this.#price;
  }

  get stock() {
    return this.#stock;
  }

  hasStock(quantity) {
    return quantity <= this.#stock;
  }

  reduceStock(quantity) {
    this.#stock -= quantity;
  }

  /** Changes the price and returns the old one */
  changePrice(newPrice) {
    if (typeof newPrice !== 'number' || newPrice < 0) throw new RangeError('The price must be a number of 0 or more');
    const oldPrice = this.#price;
    this.#price = newPrice;
    return oldPrice;
  }
}
