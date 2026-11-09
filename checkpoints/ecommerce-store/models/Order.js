// models/Order.js
// An order keeps a COPY of each product's name and price at the moment of
// buying, so changing a product's price later doesn't change old orders.

const mongoose = require('mongoose');

const STATUSES = ['pending', 'shipped', 'delivered', 'cancelled'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: String,
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: [(a) => a.length > 0, 'An order needs at least one item'] },
    shipping: {
      fullName: { type: String, required: [true, 'Full name is required'], trim: true },
      address: { type: String, required: [true, 'Address is required'], trim: true },
      city: { type: String, required: [true, 'City is required'], trim: true },
      phone: { type: String, required: [true, 'Phone is required'], trim: true },
    },
    paymentMethod: { type: String, default: 'Cash on delivery' },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: STATUSES, default: 'pending' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;
