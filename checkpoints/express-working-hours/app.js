// Builds the Express app (server.js starts it, the tests use it directly)

const path = require('path');
const express = require('express');
const { workingHours } = require('./middleware/workingHours');

function createApp({ now } = {}) {
  const app = express();

  // EJS template engine: pages live in views/, shared nav and footer in views/partials/
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // The CSS is served before the time check, so the "closed" page is styled too
  app.use(express.static(path.join(__dirname, 'public')));

  // Every page below this line is only reachable during working hours
  app.use(workingHours({ now }));

  // Read the data sent by the contact form
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (req, res) => {
    res.render('home', { title: 'Home', current: 'home' });
  });

  app.get('/services', (req, res) => {
    res.render('services', { title: 'Our Services', current: 'services' });
  });

  app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact us', current: 'contact', sent: null, errors: [], form: {} });
  });

  app.post('/contact', (req, res) => {
    const form = {
      name: (req.body.name || '').trim(),
      email: (req.body.email || '').trim(),
      message: (req.body.message || '').trim(),
    };
    const errors = [];
    if (!form.name) errors.push('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.push('Please enter a valid email address.');
    if (form.message.length < 10) errors.push('Your message should be at least 10 characters.');

    if (errors.length > 0) {
      return res.status(400).render('contact', { title: 'Contact us', current: 'contact', sent: null, errors, form });
    }
    // A real site would save this or email it. Here we just thank the visitor.
    console.log(`New message from ${form.name}`);
    res.render('contact', { title: 'Contact us', current: 'contact', sent: form.name, errors: [], form: {} });
  });

  // Anything else: 404 page
  app.use((req, res) => {
    res.status(404).render('not-found', { title: 'Page not found', current: null });
  });

  return app;
}

module.exports = { createApp };
