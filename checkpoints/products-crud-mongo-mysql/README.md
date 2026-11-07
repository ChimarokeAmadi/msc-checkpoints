# Products CRUD: MongoDB vs MySQL

In this checkpoint I built the same Product API twice: once with **MongoDB** (through Mongoose) and once with **MySQL** (through mysql2). The goal was to make both controllers behave exactly the same from the outside, while each one uses its own database's way of doing things. Both run in the same Express server:

- `/mongo/products` uses `NoSQLcontroller.js` (MongoDB + Mongoose)
- `/sql/products` uses `SQLcontroller.js` (MySQL + mysql2)

Each one has the five routes from the instructions: `POST /products`, `GET /products`, `GET /products/:id`, `PUT /products/:id` and `DELETE /products/:id`.

## Running it

```bash
npm install
npm start
```

You don't need to install MongoDB or MySQL. If no database settings are given, the server starts a temporary MongoDB (with `mongodb-memory-server`) and a temporary MySQL server (with `mysql-memory-server`). **The very first start downloads MySQL, which takes a minute or two.** After that, it's fast. The data disappears when you stop the server. To use real databases, copy `.env.example` to `.env` and fill in `MONGO_URI` and the `MYSQL_*` settings. The `products` table is created automatically from `sql/schema.sql`.

To try it with curl (swap `mongo` for `sql` to use the other database):

```bash
curl -H "Content-Type: application/json" -d '{"name":"Laptop Stand","price":35.5,"category":"Office"}' http://localhost:3000/mongo/products
curl http://localhost:3000/mongo/products
curl -X PUT -H "Content-Type: application/json" -d '{"price":29.99,"inStock":false}' http://localhost:3000/mongo/products/<id>
curl -X DELETE http://localhost:3000/mongo/products/<id>
```

To run the tests:

```bash
npm test
```

## The Product model

The fields are the same in both databases, but they're described in different ways.

**MongoDB** (`src/models/Product.js`) uses a Mongoose schema. `name` and `price` have `required: true`, `category` defaults to `null`, and `inStock` has `default: true`. The id is created automatically by MongoDB as `_id` (an ObjectId).

**MySQL** (`sql/schema.sql`) uses a `CREATE TABLE`. `id` is `INT AUTO_INCREMENT PRIMARY KEY`, `name` and `price` are `NOT NULL`, `category` can be `NULL`, and `in_stock` is `BOOLEAN NOT NULL DEFAULT TRUE`. I used `DECIMAL(10,2)` for the price instead of `FLOAT`, because money should be exact. I also added `CHECK` constraints so the database itself refuses a negative price or an empty name.

Both also have `createdAt` / `updatedAt`: `timestamps: true` in Mongoose, and `TIMESTAMP` columns with `ON UPDATE CURRENT_TIMESTAMP` in MySQL.

## Keeping the two consistent

This was the main challenge. The two databases don't give back the same data by default:

- MongoDB calls the id `_id` and adds `__v`.
- MySQL returns `in_stock` as `1` or `0` (MySQL's BOOLEAN is really a TINYINT), and returns `DECIMAL` as a string like `"29.99"`.

So I made both return the same shape:

```json
{ "id": "...", "name": "...", "price": 29.99, "category": "...", "inStock": false, "createdAt": "...", "updatedAt": "..." }
```

In Mongoose, a `toJSON` transform does this. In the SQL controller, a `toProduct(row)` function does it, together with the `decimalNumbers: true` option of mysql2. The id is a string in both, because MongoDB ids are strings anyway.

Both controllers also use **the same validation function** (`src/utils/validateProduct.js`), so they accept and reject exactly the same data:

- the name is required (up to 100 characters)
- the price must be a number between 0 and 99,999,999.99, and is rounded to 2 decimals like `DECIMAL(10,2)`
- `inStock` must be a real `true`/`false`, not the text `"yes"`

They also answer errors in the same way:

| Problem | Status |
|---|---|
| bad data | 400 |
| invalid id format | 400 |
| product doesn't exist | 404 |

**PUT** only changes the fields you send. For example, `{"price": 29.99}` changes just the price, and the rest stays the same.

## Side-by-side

| Operation | Mongoose (NoSQLcontroller) | mysql2 (SQLcontroller) |
|---|---|---|
| Create | `Product.create(data)` | `INSERT INTO products (name, price, category, in_stock) VALUES (?, ?, ?, ?)`, then a `SELECT` by `insertId` |
| Read all | `Product.find().sort({ createdAt: 1 })` | `SELECT ... FROM products ORDER BY id` |
| Read one | `Product.findById(id)` | `SELECT ... WHERE id = ?` |
| Update | `Product.findByIdAndUpdate(id, changes, { returnDocument: 'after', runValidators: true })` | `UPDATE products SET price = ?, in_stock = ? WHERE id = ?`, then a `SELECT` |
| Delete | `Product.findByIdAndDelete(id)` | `SELECT` (to return it), then `DELETE FROM products WHERE id = ?` |
| "Not found" | the method returns `null` | `rows` is empty or `affectedRows` is 0 |
| Valid id | `mongoose.isValidObjectId(id)` | a positive whole number |

The biggest difference I noticed: Mongoose does a lot in one call (create *and* return the document, update *and* return the new version), while with SQL I write each step myself. For example, `INSERT` only returns the new `insertId`, so I have to run a `SELECT` to get the full product back.

## Parameterized queries (SQL injection)

Every value in `SQLcontroller.js` goes into the query as a `?` placeholder and is passed separately, for example `execute('SELECT ... WHERE id = ?', [id])`. I used `pool.execute()`, which uses prepared statements: MySQL gets the SQL text and the values separately, so a value can never become part of the SQL. The test saves a product named `Robert'); DROP TABLE products; --`. It's stored as a normal name, and the table is still there.

The `UPDATE` query is the only one I build dynamically, because only the fields that were sent should change. The column names there come from my own fixed list (`COLUMNS`), never from the request, and the values are still placeholders.

## Error handling

I used **Express 5**, which sends errors from `async` controllers to the error handler automatically, so I didn't need try/catch or a `catchAsync` wrapper. Controllers just `throw new AppError('Product not found', 404)`. One error handler in `app.js` turns everything into `{ "status": "error", "message": "..." }`, including broken JSON, Mongoose validation errors and MySQL `CHECK` constraint errors. Unexpected errors only show "Something went wrong" to the client.

## Tests

`test/products.test.js` runs **the same 11 tests against both controllers**: create, defaults, validation, list, read one, update, delete, the 404 and 400 cases, rounding, injection attempts and broken JSON. On top of that, 2 extra tests check that both databases return exactly the same fields for the same product, and that the real MySQL table has the right columns (auto-increment id, `NOT NULL` name and price, nullable category, `in_stock` defaulting to 1). That's 24 tests in total.

## Project structure

```
sql/schema.sql               the MySQL table
src/
  app.js                     Express app, routes for both databases, error handler
  server.js                  connects to both databases and starts the server
  config/                    settings, MongoDB connection, MySQL pool
  models/Product.js          the Mongoose schema
  controllers/
    NoSQLcontroller.js       CRUD with Mongoose
    SQLcontroller.js         CRUD with mysql2 + parameterized SQL
  routes/productRoutes.js    the 5 routes, used for both controllers
  utils/                     AppError and the shared validation
test/products.test.js
```
