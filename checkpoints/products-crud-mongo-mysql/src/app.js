// The Express app. Both databases get the same /products routes, under a prefix:
//   /mongo/products  -> NoSQLcontroller (MongoDB + Mongoose)
//   /sql/products    -> SQLcontroller   (MySQL + mysql2)

const express = require('express');
const productRoutes = require('./routes/productRoutes');
const NoSQLcontroller = require('./controllers/NoSQLcontroller');
const SQLcontroller = require('./controllers/SQLcontroller');
const AppError = require('./utils/AppError');

function createApp() {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (req, res) => {
    res.json({
      message: 'Products CRUD with MongoDB and MySQL',
      mongo: '/mongo/products',
      mysql: '/sql/products',
    });
  });

  app.use('/mongo/products', productRoutes(NoSQLcontroller));
  app.use('/sql/products', productRoutes(SQLcontroller));

  // Unknown route
  app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.method} ${req.originalUrl}`, 404));
  });

  // Central error handler. Express 5 sends errors from async controllers here
  // automatically, so the controllers don't need try/catch.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    let status = err.statusCode || 500;
    let message = err.message;

    if (err.type === 'entity.parse.failed') {
      status = 400;
      message = 'The request body is not valid JSON';
    } else if (err.name === 'ValidationError') {
      status = 400; // Mongoose schema rule broken
    } else if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      status = 400; // MySQL CHECK constraint broken
    } else if (status === 500) {
      console.error('Unexpected error:', err);
      message = 'Something went wrong';
    }

    res.status(status).json({ status: 'error', message });
  });

  return app;
}

module.exports = { createApp };
