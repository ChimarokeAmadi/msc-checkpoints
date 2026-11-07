// One validation function shared by BOTH controllers, so MongoDB and MySQL
// accept and reject exactly the same input.
//
// validateProduct(body)                    -> for create: name and price required
// validateProduct(body, { partial: true }) -> for update: any of the fields, at least one

const AppError = require('./AppError');

const MAX_PRICE = 99999999.99; // the biggest value DECIMAL(10,2) can hold

function validateProduct(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('The request body must be a JSON object', 400);
  }

  const errors = [];
  const product = {};

  // name: string, required
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      errors.push('name must be a non-empty string');
    } else if (body.name.trim().length > 100) {
      errors.push('name must be at most 100 characters');
    } else {
      product.name = body.name.trim();
    }
  } else if (!partial) {
    errors.push('name is required');
  }

  // price: number, required
  if (body.price !== undefined) {
    if (typeof body.price !== 'number' || !Number.isFinite(body.price)) {
      errors.push('price must be a number');
    } else if (body.price < 0 || body.price > MAX_PRICE) {
      errors.push(`price must be between 0 and ${MAX_PRICE}`);
    } else {
      product.price = Math.round(body.price * 100) / 100; // 2 decimals, like DECIMAL(10,2)
    }
  } else if (!partial) {
    errors.push('price is required');
  }

  // category: string, optional (null or "" removes it)
  if (body.category !== undefined) {
    if (body.category === null || body.category === '') {
      product.category = null;
    } else if (typeof body.category !== 'string') {
      errors.push('category must be a string');
    } else if (body.category.trim().length > 50) {
      errors.push('category must be at most 50 characters');
    } else {
      product.category = body.category.trim() || null;
    }
  }

  // inStock: boolean, defaults to true (the database sets the default)
  if (body.inStock !== undefined) {
    if (typeof body.inStock !== 'boolean') {
      errors.push('inStock must be true or false');
    } else {
      product.inStock = body.inStock;
    }
  }

  if (errors.length > 0) {
    throw new AppError(`Invalid product: ${errors.join(', ')}`, 400);
  }
  if (partial && Object.keys(product).length === 0) {
    throw new AppError('Send at least one field to update: name, price, category or inStock', 400);
  }
  return product;
}

module.exports = { validateProduct, MAX_PRICE };
