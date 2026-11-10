// data/content.js
// The starter content: categories, an About page and a few posts, so the
// deployed site isn't empty. seed.js adds them when the database is empty.

const categories = [
  { name: 'Web Basics', description: 'HTML, CSS and how the web works.' },
  { name: 'JavaScript', description: 'The language of the browser (and the server).' },
  { name: 'Backend', description: 'Servers, APIs and databases.' },
  { name: 'Learning', description: 'Notes about learning to code.' },
];

const posts = [
  {
    type: 'page',
    title: 'About',
    slug: 'about',
    menuOrder: 1,
    excerpt: 'What Inkwell is and who writes here.',
    body: `Inkwell is a small content management system (CMS) that I built for my GoMyCode MERN checkpoint.

Everything you read on this site is stored in **MongoDB** and written from the Inkwell dashboard:

- **Authors** write posts and send them for review.
- **Editors** check them, fix them and publish them.
- The **admin** manages the team.

Every change is saved as a revision, so nothing written is ever lost. Comments from visitors wait for a moderator before they appear.

Want to try it? [Create an account](/register) and you can write your first draft.`,
  },
  {
    title: 'What happens when you type a URL',
    category: 'Web Basics',
    tags: ['http', 'dns', 'browser'],
    cover: '/covers/cover-1.svg',
    excerpt: 'From the moment you press Enter to the moment the page appears, in five simple steps.',
    body: `It feels instant, but a lot happens between pressing **Enter** and seeing a page.

## 1. Finding the server (DNS)

Computers talk with IP addresses, not names. Your browser first asks a DNS server: *"what is the address of example.com?"* The answer is something like \`93.184.215.14\`.

## 2. Opening a connection

The browser opens a connection to that address. With HTTPS, both sides also agree on a secret key, so nobody in the middle can read what is sent.

## 3. Asking for the page

The browser sends an HTTP request:

\`\`\`
GET / HTTP/1.1
Host: example.com
\`\`\`

## 4. The server answers

The server sends back a status code (\`200 OK\`, \`404 Not Found\`...) and the HTML.

## 5. Building the page

The browser reads the HTML, downloads the CSS, JavaScript and images it links to, and draws the page.

> Next time a site is slow, you'll know there are at least five places where it could be waiting.`,
  },
  {
    title: 'Flexbox or Grid? A simple rule',
    category: 'Web Basics',
    tags: ['css', 'layout'],
    cover: '/covers/cover-2.svg',
    excerpt: 'Both are great. Here is the one question I ask myself to choose.',
    body: `When I started with CSS layout, I never knew which one to use. Now I ask one question:

**Am I placing things in one direction, or in two?**

- One direction (a row of buttons, a navbar, a list): **Flexbox**.
- Two directions (a page layout, a grid of cards): **Grid**.

## A card grid in three lines

\`\`\`css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
\`\`\`

The cards fill the row, and wrap by themselves on small screens. No media query needed.

## A navbar with Flexbox

\`\`\`css
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
\`\`\`

Of course you can mix them: a Grid page, with Flexbox inside each card.`,
  },
  {
    title: 'async/await explained with coffee',
    category: 'JavaScript',
    tags: ['javascript', 'async'],
    cover: '/covers/cover-3.svg',
    excerpt: 'Ordering a coffee is the easiest way I found to understand promises.',
    body: `You order a coffee. The barista doesn't make you stand still until it's ready: you get a **receipt** and you can do other things. That receipt is a **Promise**.

\`\`\`js
const coffee = orderCoffee(); // a Promise: the coffee isn't ready yet
\`\`\`

When you really need the coffee, you **wait** for it:

\`\`\`js
async function morning() {
  const coffee = await orderCoffee();
  drink(coffee);
}
\`\`\`

## When things go wrong

Sometimes they run out of milk. With \`await\`, errors are caught like normal code:

\`\`\`js
try {
  const coffee = await orderCoffee();
} catch (err) {
  console.log('No coffee today:', err.message);
}
\`\`\`

## Two orders at the same time

If you order a coffee **and** a croissant, don't wait for one before ordering the other:

\`\`\`js
const [coffee, croissant] = await Promise.all([orderCoffee(), orderCroissant()]);
\`\`\``,
  },
  {
    title: 'Building a REST API with Express in 15 lines',
    category: 'Backend',
    tags: ['node', 'express', 'api'],
    cover: '/covers/cover-4.svg',
    excerpt: 'The smallest useful API, and the four HTTP methods that make CRUD.',
    body: `A REST API is just a set of URLs that answer with JSON. Here is a tiny one for notes:

\`\`\`js
const express = require('express');
const app = express();
app.use(express.json());

let notes = [];

app.get('/notes', (req, res) => res.json(notes));
app.post('/notes', (req, res) => {
  const note = { id: Date.now(), text: req.body.text };
  notes.push(note);
  res.status(201).json(note);
});
app.delete('/notes/:id', (req, res) => {
  notes = notes.filter((n) => n.id !== Number(req.params.id));
  res.status(204).end();
});

app.listen(3000);
\`\`\`

| Method | Means |
|---|---|
| GET | read |
| POST | create |
| PUT | update |
| DELETE | remove |

The notes disappear when the server stops, so the next step is a database, like MongoDB with Mongoose. That's exactly how this site stores its posts.`,
  },
  {
    title: 'MongoDB vs SQL: how I think about it',
    category: 'Backend',
    tags: ['mongodb', 'sql', 'database'],
    cover: '/covers/cover-5.svg',
    excerpt: 'Documents or tables? It depends on the shape of your data.',
    body: `In SQL, data lives in **tables** with fixed columns, and you join tables together. In MongoDB, data lives in **documents** (like JSON objects) that can hold lists and other objects inside them.

## A blog post, both ways

In SQL, a post and its tags need two or three tables. In MongoDB, it's one document:

\`\`\`json
{
  "title": "Hello",
  "tags": ["intro", "news"],
  "author": "64f1...",
  "status": "published"
}
\`\`\`

## My rule

- If the data is **read together**, keep it together (a document).
- If the data is **shared and changed in many places**, keep it separate and reference it.

That's why, in this CMS, the tags live inside the post, but the author is a reference to a separate user.`,
  },
  {
    title: 'Five things I wish I knew when I started coding',
    category: 'Learning',
    tags: ['learning', 'tips'],
    cover: '/covers/cover-6.svg',
    excerpt: 'Small habits that would have saved me a lot of time.',
    body: `1. **Read the error message.** All of it. It usually tells you the file and the line.
2. **Commit often.** A small commit is a save point you can always come back to.
3. **Build small things.** A to-do app teaches more than ten tutorials.
4. **Explain your code out loud.** If you can't explain a line, that's the bug (or the thing to learn).
5. **Rest.** The solution often comes after a walk, not after another hour of staring.

What would be on your list? Leave a comment below.`,
  },
];

module.exports = { categories, posts };
