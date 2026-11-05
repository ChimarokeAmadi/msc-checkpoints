// The Shop is the entry point (a facade). It owns no global state: everything
// it needs is passed in, and every customer has their own Cart object.

import { Catalog } from './catalog/Catalog.js';
import { Cart } from './cart/Cart.js';
import { Customer } from './models/Customer.js';
import { Product } from './models/Product.js';
import { PriceCalculator } from './pricing/PriceCalculator.js';
import { CheckoutService } from './checkout/CheckoutService.js';
import { CustomerPriceAlert } from './notifications/CustomerPriceAlert.js';
import { createChannel } from './notifications/channels.js';
import { ShopError } from './errors.js';
import { formatAmount } from './money.js';

export class Shop {
  #customers = new Map();
  #carts = new Map();

  constructor({ catalog = new Catalog(), calculator = new PriceCalculator(), output = console } = {}) {
    this.catalog = catalog;
    this.calculator = calculator;
    this.output = output;
    this.checkoutService = new CheckoutService({ calculator, output });
  }

  addProduct(name, price, category, weightKg, stock) {
    return this.catalog.add(new Product(name, price, category, weightKg, stock));
  }

  addCustomer(details) {
    const customer = new Customer(details);
    this.#customers.set(customer.name, customer);
    this.#carts.set(customer.name, new Cart(customer));
    customer.watchList.forEach((productName) => this.watch(customer.name, productName));
    return customer;
  }

  /** Subscribes the customer to price drops of a product (Observer). Returns an unsubscribe function. */
  watch(customerName, productName) {
    const customer = this.#customers.get(customerName);
    const alert = new CustomerPriceAlert(customer, createChannel(customer.preferredChannel, this.output));
    return this.catalog.priceWatcher.subscribe(productName, alert);
  }

  addToCart(customerName, productName, quantity) {
    try {
      this.#carts.get(customerName).add(this.catalog.find(productName), quantity);
    } catch (error) {
      if (!(error instanceof ShopError)) throw error;
      this.output.log(error.message);
    }
  }

  estimateShipping(customerName) {
    const shipping = this.calculator.calculate(this.#carts.get(customerName), '').shipping;
    this.output.log(`Estimated shipping for ${customerName}: ${formatAmount(shipping)}`);
    return shipping;
  }

  checkout(customerName, couponCode = '') {
    return this.checkoutService.checkout(this.#carts.get(customerName), couponCode);
  }

  /** The Catalog tells the PriceWatcher, which notifies the subscribed alerts */
  changePrice(productName, newPrice) {
    return this.catalog.changePrice(productName, newPrice);
  }
}
