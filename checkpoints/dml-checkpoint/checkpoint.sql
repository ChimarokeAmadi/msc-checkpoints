-- Relational model:
-- Customer (Customer_id, customer_Name, customer_Tel)
-- Product  (Product_id, product_name, category, Price)
-- Orders   (#Customer_id, #Product_id, OrderDate, quantity, total_amount)

-- The tables are created in ../sql-ddl-checkpoint/checkpoint.sql.
-- Customer and Product are filled first because Orders references them.

-- ---------- Product ----------

INSERT INTO Product (Product_id, Product_Name, Category, Price)
VALUES ('P01', 'Samsung Galaxy S20', 'Smartphone', 3299);

INSERT INTO Product (Product_id, Product_Name, Category, Price)
VALUES ('P02', 'ASUS Notebook', 'PC', 4599);

-- ---------- Customer ----------

INSERT INTO Customer (Customer_id, Customer_Name, Customer_Tel)
VALUES ('C01', 'ALI', 71321009);

INSERT INTO Customer (Customer_id, Customer_Name, Customer_Tel)
VALUES ('C02', 'ASMA', 77345823);

-- ---------- Orders ----------

INSERT INTO Orders (Customer_id, Product_id, OrderDate, Quantity, Total_amount)
VALUES ('C01', 'P02', NULL, 2, 9198);

INSERT INTO Orders (Customer_id, Product_id, OrderDate, Quantity, Total_amount)
VALUES ('C02', 'P01', TO_DATE('28/05/2020', 'DD/MM/YYYY'), 1, 3299);

COMMIT;
