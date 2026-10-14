-- Relational model:
-- Customer (Customer_id, customer_Name, customer_Tel)
-- Product  (Product_id, product_name, category, Price)
-- Orders   (#Customer_id, #Product_id, OrderDate, quantity, total_amount)

-- 1. Display all the data of customers
SELECT *
FROM Customer;

-- 2. Display the product_name and category for products whose price is between 5000 and 10000
SELECT Product_Name, Category
FROM Product
WHERE Price BETWEEN 5000 AND 10000;

-- 3. Display all the data of products sorted in descending order of price
SELECT *
FROM Product
ORDER BY Price DESC;

-- 4. Display the total number of orders, the average amount,
--    the highest total amount and the lowest total amount
SELECT
	COUNT(*)          AS total_orders,
	AVG(Total_amount) AS average_amount,
	MAX(Total_amount) AS highest_amount,
	MIN(Total_amount) AS lowest_amount
FROM Orders;

-- 5. For each product_id, display the number of orders
SELECT Product_id, COUNT(*) AS number_of_orders
FROM Orders
GROUP BY Product_id;

-- 6. Display the customer_id which has more than 2 orders
SELECT Customer_id
FROM Orders
GROUP BY Customer_id
HAVING COUNT(*) > 2;

-- 7. For each month of the 2020 year, display the number of orders
SELECT EXTRACT(MONTH FROM OrderDate) AS order_month, COUNT(*) AS number_of_orders
FROM Orders
WHERE EXTRACT(YEAR FROM OrderDate) = 2020
GROUP BY EXTRACT(MONTH FROM OrderDate)
ORDER BY order_month;

-- 8. For each order, display the product_name, the customer_name and the date of the order
SELECT p.Product_Name, c.Customer_Name, o.OrderDate
FROM Orders o
JOIN Product p ON o.Product_id = p.Product_id
JOIN Customer c ON o.Customer_id = c.Customer_id;

-- 9. Display all the orders made three months ago
--    (orders placed during the calendar month three months before the current one)
SELECT *
FROM Orders
WHERE TRUNC(OrderDate, 'MM') = TRUNC(ADD_MONTHS(SYSDATE, -3), 'MM');

-- 10. Display customers (customer_id) who have never ordered a product
SELECT c.Customer_id
FROM Customer c
WHERE NOT EXISTS (
	SELECT 1
	FROM Orders o
	WHERE o.Customer_id = c.Customer_id
);
