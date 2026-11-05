// ===================== Observer Pattern: the subject =====================
// Observers subscribe to a product. When that product's price drops, the
// PriceWatcher calls update(event) on each of them.
// It doesn't know what the observers do (email, SMS, logging, analytics...).

export class PriceWatcher {
  #observers = new Map(); // product name -> Set of observers

  /** Returns a function that unsubscribes */
  subscribe(productName, observer) {
    if (typeof observer?.update !== 'function') {
      throw new TypeError('An observer must have an update(event) method');
    }
    if (!this.#observers.has(productName)) this.#observers.set(productName, new Set());
    this.#observers.get(productName).add(observer);
    return () => this.unsubscribe(productName, observer);
  }

  unsubscribe(productName, observer) {
    this.#observers.get(productName)?.delete(observer);
  }

  observerCount(productName) {
    return this.#observers.get(productName)?.size ?? 0;
  }

  /** Called by the Catalog after every price change */
  priceChanged(product, oldPrice) {
    if (product.price >= oldPrice) return; // only drops are interesting

    const event = { product, oldPrice, newPrice: product.price };
    for (const observer of this.#observers.get(product.name) ?? []) {
      observer.update(event);
    }
  }
}
