// CRUD for products stored in MySQL, using mysql2.
// Here we write the SQL ourselves. Every value goes in as a "?" placeholder
// (a parameterized query), so user input is never glued into the SQL text.
// That's what protects us from SQL injection.

const { getPool } = require('../config/mysql');
const AppError = require('../utils/AppError');
const { validateProduct } = require('../utils/validateProduct');

const SELECT = 'SELECT id, name, price, category, in_stock, created_at, updated_at FROM products';

// The JS field names and their SQL column names. Only these columns can be updated.
const COLUMNS = { name: 'name', price: 'price', category: 'category', inStock: 'in_stock' };

// Turn a database row into the same JSON shape the MongoDB controller returns
function toProduct(row) {
  return {
    id: String(row.id),
    name: row.name,
    price: Number(row.price),
    category: row.category,
    inStock: Boolean(row.in_stock), // MySQL stores BOOLEAN as 1 / 0
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// MySQL ids are positive whole numbers (AUTO_INCREMENT)
function checkId(id) {
  if (!/^[1-9]\d{0,9}$/.test(id)) {
    throw new AppError(`"${id}" is not a valid product id`, 400);
  }
  return Number(id);
}

async function findById(id) {
  const [rows] = await getPool().execute(`${SELECT} WHERE id = ?`, [id]);
  return rows[0] ? toProduct(rows[0]) : null;
}

// POST /products
exports.createProduct = async (req, res) => {
  const data = validateProduct(req.body);
  const [result] = await getPool().execute(
    'INSERT INTO products (name, price, category, in_stock) VALUES (?, ?, ?, ?)',
    [data.name, data.price, data.category ?? null, data.inStock ?? true],
  );
  // INSERT only gives back the new id, so we read the full row
  const product = await findById(result.insertId);
  res.status(201).json({ status: 'success', data: product });
};

// GET /products
exports.getAllProducts = async (req, res) => {
  const [rows] = await getPool().execute(`${SELECT} ORDER BY id`);
  res.status(200).json({ status: 'success', results: rows.length, data: rows.map(toProduct) });
};

// GET /products/:id
exports.getProduct = async (req, res) => {
  const id = checkId(req.params.id);
  const product = await findById(id);
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json({ status: 'success', data: product });
};

// PUT /products/:id
exports.updateProduct = async (req, res) => {
  const id = checkId(req.params.id);
  const changes = validateProduct(req.body, { partial: true });

  // Build "SET name = ?, price = ?" only from the fields that were sent.
  // Column names come from our own COLUMNS list (never from the user),
  // and the values are still placeholders.
  const fields = Object.keys(changes);
  const setClause = fields.map((field) => `${COLUMNS[field]} = ?`).join(', ');
  const values = fields.map((field) => changes[field]);

  const [result] = await getPool().execute(`UPDATE products SET ${setClause} WHERE id = ?`, [...values, id]);
  if (result.affectedRows === 0) throw new AppError('Product not found', 404);

  const product = await findById(id);
  res.status(200).json({ status: 'success', data: product });
};

// DELETE /products/:id
exports.deleteProduct = async (req, res) => {
  const id = checkId(req.params.id);
  // Read it first so we can send back what was deleted (like findByIdAndDelete)
  const product = await findById(id);
  if (!product) throw new AppError('Product not found', 404);

  await getPool().execute('DELETE FROM products WHERE id = ?', [id]);
  res.status(200).json({ status: 'success', message: 'Product deleted', data: product });
};
