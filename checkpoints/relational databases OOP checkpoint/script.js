// Product: stores the id, name and price of a product
class Product {
	constructor(id, name, price) {
		this.id = id;
		this.name = name;
		this.price = price;
	}
}

// ShoppingCartItem: stores a product and its quantity
class ShoppingCartItem {
	constructor(product, quantity) {
		this.product = product;
		this.quantity = quantity;
	}

	getTotalPrice() {
		return this.product.price * this.quantity;
	}
}

// ShoppingCart: holds an array of ShoppingCartItem instances
class ShoppingCart {
	constructor() {
		this.items = [];
	}

	// Total number of items inside the cart
	getTotalItems() {
		return this.items.reduce((total, item) => total + item.quantity, 0);
	}

	// Total price of everything in the cart
	getTotalPrice() {
		return this.items.reduce((total, item) => total + item.getTotalPrice(), 0);
	}

	addItem(product, quantity = 1) {
		const existingItem = this.items.find((item) => item.product.id === product.id);

		if (existingItem) {
			existingItem.quantity += quantity;
		} else {
			this.items.push(new ShoppingCartItem(product, quantity));
		}
	}

	// Lower an item's quantity by one; remove it when it reaches zero
	decreaseItem(productId) {
		const item = this.items.find((item) => item.product.id === productId);
		if (!item) return;

		item.quantity -= 1;
		if (item.quantity <= 0) {
			this.removeItem(productId);
		}
	}

	removeItem(productId) {
		this.items = this.items.filter((item) => item.product.id !== productId);
	}

	displayCart() {
		if (this.items.length === 0) {
			console.log("The cart is empty.");
			return;
		}

		console.log("Shopping cart:");
		this.items.forEach((item) => {
			console.log(
				`- ${item.product.name} | ${item.product.price} $ x ${item.quantity} = ${item.getTotalPrice()} $`
			);
		});
		console.log(`Total items: ${this.getTotalItems()}`);
		console.log(`Total price: ${this.getTotalPrice()} $`);
	}
}

// ---------- Testing ----------

// Create products
const baskets = new Product(1, "Baskets", 100);
const socks = new Product(2, "Socks", 20);
const bag = new Product(3, "Bag", 50);

// Create a shopping cart
const cart = new ShoppingCart();

// Add items to the cart
cart.addItem(baskets, 1);
cart.addItem(socks, 3);
cart.addItem(bag, 2);

// Display the cart
cart.displayCart();

// Remove an item from the cart
console.log("\nRemoving Socks...\n");
cart.removeItem(socks.id);
cart.displayCart();

// ---------- UI (only runs in the browser) ----------

if (typeof document !== "undefined") {
	document.addEventListener("DOMContentLoaded", () => {
		const products = [
			{ product: baskets, image: "assets/baskets.png" },
			{ product: socks, image: "assets/socks.png" },
			{ product: bag, image: "assets/bag.png" },
		];

		const uiCart = new ShoppingCart();

		const productList = document.getElementById("product-list");
		const cartList = document.getElementById("cart-items");
		const totalItemsElement = document.getElementById("total-items");
		const totalPriceElement = document.getElementById("total-price");

		function renderProducts() {
			products.forEach(({ product, image }) => {
				const card = document.createElement("div");
				card.className = "product-card";
				card.innerHTML = `
					<img src="${image}" alt="${product.name}" />
					<h3>${product.name}</h3>
					<p class="price">${product.price} $</p>
					<button class="add-btn">Add to cart</button>
				`;

				card.querySelector(".add-btn").addEventListener("click", () => {
					uiCart.addItem(product, 1);
					renderCart();
				});

				productList.appendChild(card);
			});
		}

		function renderCart() {
			cartList.innerHTML = "";

			if (uiCart.items.length === 0) {
				cartList.innerHTML = `<li class="empty">Your cart is empty.</li>`;
			}

			uiCart.items.forEach((item) => {
				const row = document.createElement("li");
				row.className = "cart-row";
				row.innerHTML = `
					<span class="name">${item.product.name}</span>
					<div class="controls">
						<button class="minus" aria-label="Decrease">−</button>
						<span class="qty">${item.quantity}</span>
						<button class="plus" aria-label="Increase">+</button>
					</div>
					<span class="subtotal">${item.getTotalPrice()} $</span>
					<button class="remove" aria-label="Remove">Remove</button>
				`;

				row.querySelector(".plus").addEventListener("click", () => {
					uiCart.addItem(item.product, 1);
					renderCart();
				});
				row.querySelector(".minus").addEventListener("click", () => {
					uiCart.decreaseItem(item.product.id);
					renderCart();
				});
				row.querySelector(".remove").addEventListener("click", () => {
					uiCart.removeItem(item.product.id);
					renderCart();
				});

				cartList.appendChild(row);
			});

			totalItemsElement.textContent = uiCart.getTotalItems();
			totalPriceElement.textContent = `${uiCart.getTotalPrice()} $`;
		}

		renderProducts();
		renderCart();
	});
}
