// data/products.js
// The products the shop starts with. seed.js adds them the first time the app
// starts with an empty database (so the deployed site isn't empty).
// The pictures are SVG drawings in client/public/products/ (made by scripts/make-images.js).

module.exports = [
  { name: 'Ceramic Coffee Mug', category: 'Kitchen', price: 12.5, stock: 40, featured: true,
    description: 'A heavy stoneware mug that keeps coffee warm for longer. Holds 350 ml, safe in the dishwasher and the microwave.' },
  { name: 'Insulated Water Bottle', category: 'Kitchen', price: 24, stock: 25,
    description: 'Double-wall steel bottle (750 ml). Cold drinks stay cold for 24 hours, hot drinks stay hot for 12.' },
  { name: 'Bamboo Cutting Board', category: 'Kitchen', price: 18.9, stock: 15,
    description: 'A solid bamboo board with a juice groove. Gentle on knives and easy to clean.' },
  { name: 'Canvas Tote Bag', category: 'Bags', price: 15, stock: 60, featured: true,
    description: 'Thick cotton canvas tote with long handles and an inside pocket. Carries a full shop of groceries.' },
  { name: 'Everyday Backpack', category: 'Bags', price: 49.99, stock: 12,
    description: 'Water-resistant backpack with a padded 15-inch laptop sleeve and two side pockets for bottles.' },
  { name: 'Wireless Headphones', category: 'Tech', price: 79, stock: 8, featured: true,
    description: 'Over-ear Bluetooth headphones with 30 hours of battery, soft ear cushions and a built-in microphone.' },
  { name: 'Portable Power Bank', category: 'Tech', price: 29.5, stock: 30,
    description: '10,000 mAh power bank with USB-C fast charging. Charges most phones two times.' },
  { name: 'Desk Lamp', category: 'Home', price: 34, stock: 18,
    description: 'Adjustable metal desk lamp with a warm LED bulb. The arm and head both turn.' },
  { name: 'Potted Succulent', category: 'Home', price: 9.99, stock: 50, featured: true,
    description: 'A small, easy succulent in a white ceramic pot. Needs water only once every two weeks.' },
  { name: 'Dotted Notebook', category: 'Stationery', price: 8.5, stock: 100,
    description: 'A5 notebook with 160 dotted pages, a hard cover and a ribbon bookmark. Great for notes and sketches.' },
  { name: 'Classic Sunglasses', category: 'Fashion', price: 22, stock: 20,
    description: 'Round frames with UV400 lenses. Comes with a soft case and a cleaning cloth.' },
  { name: 'Cotton T-Shirt', category: 'Fashion', price: 14, stock: 3,
    description: 'Soft 100% cotton t-shirt with a relaxed fit. Only a few left!' },
];
