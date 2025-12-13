function removeDuplicates(arr: number[]) {
	return arr.filter((value, index) => arr.indexOf(value) === index);
}
