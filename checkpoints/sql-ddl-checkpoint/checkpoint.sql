-- Relational model:
-- Customer (Customer_id, customer_Name, customer_Tel)
-- Product  (Product_id, product_name, Price)
-- Orders   (#Customer_id, #Product_id, quantity, total_amount)

-- ---------- Create tables ----------

CREATE TABLE Customer (
	Customer_id   VARCHAR2(20) CONSTRAINT pk_customer PRIMARY KEY,
	Customer_Name VARCHAR2(20) NOT NULL,
	Customer_Tel  NUMBER
);

CREATE TABLE Product (
	Product_id   VARCHAR2(20) CONSTRAINT pk_product PRIMARY KEY,
	Product_Name VARCHAR2(20) NOT NULL,
	Price        NUMBER CONSTRAINT chk_price_positive CHECK (Price > 0)
);

CREATE TABLE Orders (
	Customer_id  VARCHAR2(20),
	Product_id   VARCHAR2(20),
	Quantity     NUMBER,
	Total_amount NUMBER,
	CONSTRAINT pk_orders PRIMARY KEY (Customer_id, Product_id),
	CONSTRAINT fk_orders_customer FOREIGN KEY (Customer_id) REFERENCES Customer (Customer_id),
	CONSTRAINT fk_orders_product FOREIGN KEY (Product_id) REFERENCES Product (Product_id)
);

-- ---------- Alter tables ----------

-- Add a column Category (VARCHAR2(20)) to the PRODUCT table
ALTER TABLE Product ADD Category VARCHAR2(20);

-- Add a column OrderDate (DATE) to the ORDERS table with SYSDATE as the default value
ALTER TABLE Orders ADD OrderDate DATE DEFAULT SYSDATE;
