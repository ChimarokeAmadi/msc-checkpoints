// ===================== Builder Pattern =====================
// Builds a Product step by step. Each method names what it sets and returns the
// builder, so the calls can be chained in any order. Optional fields have defaults,
// and build() checks everything at once and lists every problem it finds.

export class ProductBuilder {
  #spec;
  #create;

  constructor(name, create) {
    this.#create = create;
    this.#spec = {
      name,
      price: undefined, // required
      category: 'general',
      weightKg: 0,
      stock: 0,
      sku: null,
      brand: null,
      description: '',
      tags: [],
    };
  }

  price(amount) {
    this.#spec.price = amount;
    return this;
  }

  category(category) {
    this.#spec.category = category;
    return this;
  }

  weight(kg) {
    this.#spec.weightKg = kg;
    return this;
  }

  stock(quantity) {
    this.#spec.stock = quantity;
    return this;
  }

  sku(sku) {
    this.#spec.sku = sku;
    return this;
  }

  brand(brand) {
    this.#spec.brand = brand;
    return this;
  }

  description(text) {
    this.#spec.description = text;
    return this;
  }

  tags(...tags) {
    this.#spec.tags.push(...tags);
    return this;
  }

  build() {
    const problems = ProductBuilder.#validate(this.#spec);
    if (problems.length > 0) {
      throw new Error(`Cannot build product "${this.#spec.name}": ${problems.join('; ')}`);
    }
    return this.#create({ ...this.#spec, tags: [...this.#spec.tags] });
  }

  static #validate(spec) {
    return VALIDATION_RULES.filter(({ isValid }) => !isValid(spec)).map(({ problem }) => problem);
  }
}

// Each rule is small and has its own message. Adding a rule = adding one line.
const isNonNegativeNumber = (value) => typeof value === 'number' && value >= 0;

const VALIDATION_RULES = [
  { problem: 'name is required', isValid: ({ name }) => typeof name === 'string' && name.trim() !== '' },
  { problem: 'price must be a number of 0 or more', isValid: ({ price }) => isNonNegativeNumber(price) },
  { problem: 'weight must be 0 kg or more', isValid: ({ weightKg }) => isNonNegativeNumber(weightKg) },
  { problem: 'stock must be a whole number of 0 or more', isValid: ({ stock }) => Number.isInteger(stock) && stock >= 0 },
];
