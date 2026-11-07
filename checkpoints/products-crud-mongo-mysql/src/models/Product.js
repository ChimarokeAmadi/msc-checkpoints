// The MongoDB version of the Product model (Mongoose schema).
// The id is generated automatically by MongoDB as "_id".

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      maxlength: [100, 'name must be at most 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'price is required'],
      min: [0, 'price cannot be negative'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'category must be at most 50 characters'],
      default: null, // optional
    },
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }, // createdAt and updatedAt, like the SQL table
);

// Send "id" instead of "_id" and hide "__v", so both APIs return the same shape
productSchema.set('toJSON', {
  transform: (doc, ret) => ({
    id: ret._id.toString(),
    name: ret.name,
    price: ret.price,
    category: ret.category,
    inStock: ret.inStock,
    createdAt: ret.createdAt,
    updatedAt: ret.updatedAt,
  }),
});

module.exports = mongoose.model('Product', productSchema);
