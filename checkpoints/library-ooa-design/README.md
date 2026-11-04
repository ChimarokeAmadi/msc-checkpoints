# Library Management System: Object-Oriented Analysis and Design

In this checkpoint I analysed and designed a library management system before building it. I worked out who uses it and what they need to do, split it into components, modelled the classes and how they behave, and then wrote some code to show how the design turns into a real program.

## What's in this folder

- **[DESIGN.md](DESIGN.md)** is the main document. It has everything the checkpoint asks for, in this order:
  - **Requirement analysis:** actors, functional and non-functional requirements, and a list of 13 use cases
  - **Use case diagram**, plus full descriptions of the Issue book and Return book use cases
  - **System architecture:** a layered design (UI, API, services, domain model, repositories, database) with a diagram of how the parts talk to each other
  - **Class diagram** with attributes, methods and relationships
  - **Three sequence diagrams:** issue book, return book and search book
  - **State diagram for a Book:** Available → Issued → Returned → Available, plus Reserved, Damaged, Lost and Removed
  - **Data model:** an ER diagram of the database tables
  - **Functional model:** data flow diagrams, level 0 and level 1
  - **Behavioural model:** the loan state diagram and an activity diagram for the daily overdue check
  - **Abstraction to implementation:** code snippets and pseudocode
- **[diagrams.html](diagrams.html)** is the same document as a web page, with all the diagrams drawn. Just open it in a browser (it needs internet to load the diagram library). From the browser you can also print it or save it as a PDF.
- **[code/](code)** has a small working version of the design in JavaScript: the `Book` class with its state rules, the user classes, `Loan`, `Fine`, `Reservation`, in-memory repositories and the services.

## Viewing the diagrams

I wrote the diagrams in Mermaid, a way of describing diagrams as text. GitHub draws them automatically when you open `DESIGN.md`, and so does VS Code with the "Markdown Preview Mermaid Support" extension. I chose this over Lucidchart or draw.io because the diagrams live in the same file as the explanations and are easy to update. If I change `DESIGN.md`, running `node build-html.js` updates `diagrams.html` too.

## Running the code

```bash
node code/demo.js
```

It goes through the main use cases with sample data:

- searching for a book
- issuing a book and trying to issue it to someone else
- reserving a book and trying to renew a reserved book
- returning a book late, which creates a fine and holds the book for the next member
- returning a damaged book
- an illegal state change that the `Book` class refuses
- the daily overdue check
- paying a fine

Each step prints what happens, so you can follow it next to the diagrams.
