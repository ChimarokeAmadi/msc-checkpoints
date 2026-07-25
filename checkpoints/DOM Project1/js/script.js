document.addEventListener("DOMContentLoaded", () => {
	const totalPriceElement = document.querySelector(".total");

	function getProductCards() {
		return document.querySelectorAll(".list-products .card");
	}

	function updateTotalPrice() {
		let total = 0;

		getProductCards().forEach((card) => {
			const unitPrice = parseFloat(card.querySelector(".unit-price").textContent);
			const quantity = parseInt(card.querySelector(".quantity").textContent, 10);
			total += unitPrice * quantity;
		});

		totalPriceElement.textContent = `${total} $`;
	}

	function setupProductCard(card) {
		const quantityElement = card.querySelector(".quantity");
		const incrementButton = card.querySelector(".fa-plus-circle");
		const decrementButton = card.querySelector(".fa-minus-circle");
		const deleteButton = card.querySelector(".fa-trash-alt");
		const likeButton = card.querySelector(".fa-heart");

		incrementButton.addEventListener("click", () => {
			const currentQuantity = parseInt(quantityElement.textContent, 10);
			quantityElement.textContent = currentQuantity + 1;
			updateTotalPrice();
		});

		decrementButton.addEventListener("click", () => {
			const currentQuantity = parseInt(quantityElement.textContent, 10);
			if (currentQuantity > 0) {
				quantityElement.textContent = currentQuantity - 1;
				updateTotalPrice();
			}
		});

		deleteButton.addEventListener("click", () => {
			card.parentElement.remove();
			updateTotalPrice();
		});

		likeButton.addEventListener("click", () => {
			const isLiked = likeButton.classList.toggle("liked");
			likeButton.style.color = isLiked ? "#de6b5c" : "black";
		});
	}

	getProductCards().forEach(setupProductCard);
	updateTotalPrice();
});
