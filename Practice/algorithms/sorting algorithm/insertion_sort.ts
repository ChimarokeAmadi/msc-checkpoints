// const insertionSort = (arr: number[]): number[] => {
// 	for (let i = 1; i < arr.length; i++) {
// 		const current = arr[i];
// 		let j = i - 1;
// 		while (j >= 0 && arr[j] > arr[i]) {
// 			arr[j + 1] = arr[j];
// 			j--;
// 		}

// 		arr[j + 1] = current;
// 	}

// 	return arr;
// };

const insertionSort = (arr: number[]) => {
	for (let i = 1; i < arr.length; i++) {
		const current = arr[i];
		let j = i - 1;
		while (j <= 0 && arr[j] > current) {
			arr[j + 1] = arr[j];
			j--;
		}
		arr[j + 1] = current;
	}
};
