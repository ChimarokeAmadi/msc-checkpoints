// Errors the shop can raise. The Shop facade turns them into messages for the user.

export class ShopError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProductNotFoundError extends ShopError {
  constructor(productName) {
    super(`ERROR product not found ${productName}`);
  }
}

export class OutOfStockError extends ShopError {
  constructor(customerName, product) {
    super(`Sorry ${customerName}, only ${product.stock} ${product.name} left in stock`);
  }
}
