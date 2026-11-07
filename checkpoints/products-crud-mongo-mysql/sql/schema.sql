-- The MySQL version of the Product model.
-- It's run automatically when the server starts (CREATE TABLE IF NOT EXISTS),
-- but you can also paste it into MySQL Workbench / the mysql CLI.

CREATE TABLE IF NOT EXISTS products (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,           -- auto-generated id
  name       VARCHAR(100)  NOT NULL,                          -- required
  price      DECIMAL(10,2) NOT NULL,                          -- required, exact money value
  category   VARCHAR(50)   NULL DEFAULT NULL,                 -- optional
  in_stock   BOOLEAN       NOT NULL DEFAULT TRUE,             -- default: true
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_products_price CHECK (price >= 0),
  CONSTRAINT chk_products_name CHECK (CHAR_LENGTH(TRIM(name)) > 0)
);
