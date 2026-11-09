// seed.js
// Adds the starting products when the products collection is empty.
// It's called when the server connects to MongoDB, so a fresh Atlas database
// fills itself on the first start. It never touches a shop that already has products.

const Product = require('./models/Product');
const starter = require('./data/products');

async function seedIfEmpty() {
  if ((await Product.estimatedDocumentCount()) > 0) return 0;
  const docs = starter.map((p) => {
    const slug = Product.slugify(p.name);
    return { ...p, slug, image: `/products/${slug}.svg` };
  });
  await Product.insertMany(docs);
  console.log(`Added ${docs.length} starter products`);
  return docs.length;
}

module.exports = { seedIfEmpty };
