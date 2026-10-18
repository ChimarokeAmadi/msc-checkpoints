import React from 'react';
import product from '../product';

function Image() {
  return <img className="product-image" src={product.image} alt={product.name} />;
}

export default Image;
