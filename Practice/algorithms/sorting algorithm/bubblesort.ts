const bubbleSort = (arr: number[]): number[] => {
	const n = arr.length;
	let swapped: boolean;

	for (let i = 0; i < n - 1; i++) {
		swapped = false;
		for (let j = 0; j < n - i - 1; j++) {
			if (arr[j] > arr[j + 1]) {
				// Swap arr[j] and arr[j + 1]
				[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
				swapped = true;
			}
		}
		// If no two elements were swapped, the array is already sorted
		if (!swapped) {
			break;
		}
	}
	return arr;
};
