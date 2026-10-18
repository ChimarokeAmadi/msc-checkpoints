import React from 'react';
import product from '../product';

function Price() {
  return <span className="product-price">${product.price.toFixed(2)}</span>;
}

export default Price;
