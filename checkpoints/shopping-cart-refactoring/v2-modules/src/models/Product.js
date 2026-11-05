// A product. Its stock and price change only through methods.
// (The constructor still takes 5 positional arguments, which is easy to get
// wrong. That's improved with the Builder pattern in v5.)

export class Product {
  constructor(name, price, category, weightKg, stock) {
    this.name = name;
    this.price = price;
    this.category = category;
    this.weightKg = weightKg;
    this.stock = stock;
  }

  hasStock(quantity) {
    return quantity <= this.stock;
  }

  reduceStock(quantity) {
    this.stock -= quantity;
  }

  /** Changes the price and returns the old one */
  changePrice(newPrice) {
    const oldPrice = this.price;
    this.price = newPrice;
    return oldPrice;
  }
}
