document.addEventListener("DOMContentLoaded", () => {
	const colorBox = document.getElementById("color-box");
	const changeColorBtn = document.getElementById("change-color-btn");

	function getRandomColor() {
		const hexDigits = "0123456789ABCDEF";
		let color = "#";

		for (let i = 0; i < 6; i++) {
			color += hexDigits[Math.floor(Math.random() * 16)];
		}

		return color;
	}

	changeColorBtn.addEventListener("click", () => {
		colorBox.style.backgroundColor = getRandomColor();
	});
});
