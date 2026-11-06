# Express App: Open Only During Working Hours

For this checkpoint I built a small website for a made-up web agency called "Brightway Studio". It has three pages: **Home**, **Our Services** and **Contact us**. Every page has the same nav bar, and the page you're on is highlighted. The twist is that the site is only open during working hours, **Monday to Friday from 9:00 to 17:00**. At any other time, every page shows a "Sorry, we're closed" message instead.

## How to run it

```bash
npm install
npm start
```

Then open http://localhost:3000. If you change the code, `npm run dev` restarts the server automatically.

The time check uses your computer's clock, so in the evening or at the weekend you'll only see the closed page. To see the open site anyway, you can start the server with a pretend time (here, Monday at 10:00):

```bash
DEMO_TIME="2026-11-09T10:00" npm start
```

## How it works

**Express and the routes.** `app.js` creates the Express app with one route for each page: `/`, `/services` and `/contact`. There's also a `POST /contact` route for the form and a 404 page for any other address. `server.js` just starts the app on port 3000. I kept them separate so the tests can use the app without starting a real server.

**The custom middleware.** This is the main part of the checkpoint. It's in `middleware/workingHours.js`. A middleware is a function that runs before the route, gets `req`, `res` and `next`, and decides what happens next. Mine looks at the current day and hour. If it's a weekday between 9:00 and 16:59, it calls `next()` and the page loads normally. If not, it never calls `next()`, and it sends the closed page with status 503 ("Service Unavailable"). The closed page also says when the site opens again. For example, on a Friday evening it says "Monday at 09:00". I count 17:00 itself as closed, because that's when work ends.

I register it with `app.use(workingHours())` *above* the routes, which is how it protects every page at once. The order matters in Express: the CSS is served *before* the middleware, so even the closed page is styled.

**Templates (EJS).** I used EJS as the template engine so I didn't have to copy the nav bar into every page. `views/partials/header.ejs` has the `<head>`, the nav bar and the opening of the page, and `footer.ejs` closes it. Each page includes both with `<%- include(...) %>`. The header gets a `current` value from the route, so it knows which nav link to highlight. On the services page, I loop over an array of services instead of writing every card by hand.

**CSS.** All the styling is in `public/css/style.css`. It covers the nav bar, the cards (laid out with CSS grid, with a small hover lift), the buttons and the form. On phone-sized screens, the contact page stacks into one column and the nav gets smaller.

**Contact form.** The form posts to `/contact`, and `express.urlencoded()` reads the data. I check that the name isn't empty, the email looks like an email and the message is at least 10 characters. If something is wrong, the form comes back with the errors and keeps what you typed. If everything is fine, you get a thank-you message. It doesn't really send anything anywhere, since that wasn't part of the task.

## Tests

```bash
npm test
```

I used Node's built-in test runner, so there's nothing extra to install. The trick is that `createApp({ now })` lets me pass in a fake clock, so the tests can pretend it's Monday morning or Saturday afternoon without waiting for it. They check:

- the exact edges of the hours (8:59 closed, 9:00 open, 16:59 open, 17:00 closed)
- weekends
- the "next opening" message
- that all three pages load with the nav links during working hours and return 503 when closed
- that the CSS still loads when the site is closed
- the contact form
- the 404 page
