// Every event name in one place, so a typo is an error instead of a silent bug

export const LibraryEvents = Object.freeze({
  BOOK_ADDED: 'book.added',
  MEMBER_REGISTERED: 'member.registered',
  BOOK_BORROWED: 'loan.created',
  BOOK_RETURNED: 'loan.returned',
  LOAN_RENEWED: 'loan.renewed',
  LOAN_DUE_SOON: 'loan.dueSoon',
  LOAN_OVERDUE: 'loan.overdue',
  FINE_CHARGED: 'fine.charged',
  FINE_PAID: 'fine.paid',
});
