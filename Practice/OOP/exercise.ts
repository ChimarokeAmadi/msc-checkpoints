class Book {
	id: number;
	title: string;
	author: string;
	isBorrowed: boolean;

	constructor(id: number, title: string, author: string, isBorrowed: boolean) {
		this.id = id;
		this.title = title;
		this.author = author;
		this.isBorrowed = isBorrowed;
	}

	showDetails(): void {
		console.log(
			`ID: ${this.id}, Title: ${this.title}, Author: ${this.author}, Borrowed: ${this.isBorrowed}`,
		);
	}

	changeBorrowedStatus(): void {
		this.isBorrowed = !this.isBorrowed;
	}
}
