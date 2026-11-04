// All my projects live here in one place.
// The projects pages read from this file on the server (getServerSideProps).
// To add a project, add an object to this list and an image to public/images.

const projects = [
  {
    slug: 'movie-app',
    title: 'Movie App',
    image: '/images/movie-app.svg',
    summary: 'A React app to browse movies, filter them by title or rating, and add new ones.',
    description:
      'Built with React hooks. Each movie has a card with its poster, description and rating, and you can filter the list by title or minimum rating. A later version added React Router so every movie has its own page with a trailer.',
    tech: ['React', 'React Router', 'Hooks'],
  },
  {
    slug: 'redux-todo',
    title: 'Redux To-Do List',
    image: '/images/redux-todo.svg',
    summary: 'A to-do list where tasks can be added, edited, completed and filtered.',
    description:
      'The state is managed with Redux Toolkit instead of local component state. Tasks can be added, edited, marked as done, and filtered to show all, done or not-done tasks.',
    tech: ['React', 'Redux Toolkit', 'react-redux'],
  },
  {
    slug: 'slack-bot',
    title: 'Slack Bot',
    image: '/images/slack-bot.svg',
    summary: 'A Node.js bot that answers the /hello command and logs channel messages.',
    description:
      'Made with Slack\'s Bolt framework running in Socket Mode, so it works from my own computer without a public URL. It replies to the /hello slash command and prints every message posted in the channel to the terminal.',
    tech: ['Node.js', 'Slack Bolt', 'Events API'],
  },
  {
    slug: 'shortest-path',
    title: 'Shortest Path Finder',
    image: '/images/dijkstra.svg',
    summary: "Dijkstra's algorithm to find the shortest distance between points in a graph.",
    description:
      "A JavaScript implementation of Dijkstra's algorithm using a priority queue (min-heap). Given a weighted graph and a starting point, it finds the shortest distance to every other point and the path to get there.",
    tech: ['JavaScript', 'Algorithms', 'Graphs'],
  },
  {
    slug: 'fifa-player-cards',
    title: 'FIFA Player Cards',
    image: '/images/fifa-cards.svg',
    summary: 'Player cards built from reusable React components and props.',
    description:
      'A React project that shows football players as cards. Each card is a reusable component that gets the player\'s name, team, nationality, jersey number and picture through props.',
    tech: ['React', 'Props', 'React Bootstrap'],
  },
  {
    slug: 'shopping-cart',
    title: 'Shopping Cart',
    image: '/images/shopping-cart.svg',
    summary: 'A shopping cart built with object-oriented JavaScript classes.',
    description:
      'Uses ES6 classes for products, cart items and the cart itself. You can add and remove items, change quantities and see the total update straight away.',
    tech: ['JavaScript', 'OOP', 'ES6 Classes'],
  },
];

export default projects;
