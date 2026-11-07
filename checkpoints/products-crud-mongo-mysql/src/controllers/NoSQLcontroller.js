// CRUD for products stored in MongoDB, using Mongoose.
// Mongoose gives us methods (create, find, findById...) instead of writing queries by hand.

const mongoose = require('mongoose');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { validateProduct } = require('../utils/validateProduct');

// MongoDB ids are 24-character hex strings (ObjectId)
function checkId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`"${id}" is not a valid MongoDB id`, 400);
  }
}

// POST /products
exports.createProduct = async (req, res) => {
  const data = validateProduct(req.body);
  const product = await Product.create(data);
  res.status(201).json({ status: 'success', data: product });
};

// GET /products
exports.getAllProducts = async (req, res) => {
  const products = await Product.find().sort({ createdAt: 1 });
  res.status(200).json({ status: 'success', results: products.length, data: products });
};

// GET /products/:id
exports.getProduct = async (req, res) => {
  checkId(req.params.id);
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json({ status: 'success', data: product });
};

// PUT /products/:id
exports.updateProduct = async (req, res) => {
  checkId(req.params.id);
  const changes = validateProduct(req.body, { partial: true });
  const product = await Product.findByIdAndUpdate(req.params.id, changes, {
    returnDocument: 'after', // return the product AFTER the update (replaces the old `new: true`)
    runValidators: true, // also check the schema rules on update
  });
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json({ status: 'success', data: product });
};

// DELETE /products/:id
exports.deleteProduct = async (req, res) => {
  checkId(req.params.id);
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json({ status: 'success', message: 'Product deleted', data: product });
};
