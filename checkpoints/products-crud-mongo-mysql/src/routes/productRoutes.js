// The same five routes for any controller. We call it twice in app.js:
// once with the MongoDB controller and once with the MySQL controller.

const express = require('express');

module.exports = function productRoutes(controller) {
  const router = express.Router();

  router.route('/')
    .post(controller.createProduct) // POST   /products
    .get(controller.getAllProducts); // GET    /products

  router.route('/:id')
    .get(controller.getProduct) // GET    /products/:id
    .put(controller.updateProduct) // PUT    /products/:id
    .delete(controller.deleteProduct); // DELETE /products/:id

  return router;
};
