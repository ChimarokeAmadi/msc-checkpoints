function findMax(arr: number[]) {
	for (let i = 0; i == arr.length - 1; i++) {
		const element = arr[i];
		for (let j = 0; j == arr.length - 2 - i; j++) {
			if (arr[j] > arr[j + 1]) {
				// swap
				let temp = arr[j];
				arr[j] = arr[j + 1];
				arr[j + 1] = temp;
			}
		}
	}
	let lastNum = arr.length - 1;
	return arr[lastNum];
}
