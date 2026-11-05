# User Directory (React + axios)

In this checkpoint I made a React app that gets a list of users from the JSONPlaceholder API with axios and shows each user on a card.

## How to run it

```bash
npm install
npm start      # opens http://localhost:3000
npm test       # runs the 3 tests
```

## How I built it

I created the project with `create-react-app` and installed axios with `npm install axios`. The main work is in **`src/UserList.js`**:

- **`useState`:** the users are saved in a state called `listOfUser`, which starts as an empty array. I also added states for `loading`, `error` and the `search` text.
- **`useEffect`:** inside it, `axios.get('https://jsonplaceholder.typicode.com/users')` fetches the users, and `setListOfUser(response.data)` saves them. The empty dependency array `[]` means it only runs once, when the component first appears. The cleanup function cancels the request if the component is removed before the answer arrives, using an `AbortController`.
- **`map`:** `listOfUser.map(...)` turns every user into a card with their initials in a circle, name, username, email, phone, website, address and company. Each card uses `user.id` as its `key`.

`App.js` shows a header and the `UserList` component.

## Extras

- A **loading spinner** while the request is running, and a **friendly error message** if it fails (for example without internet).
- A **search box** that filters the users by name, email, city or company, with a counter like "3 of 10 users".
- **Styling:** the cards are in a responsive grid, so there are 3 columns on a laptop and 1 on a phone. They have a hover animation, and the avatars have a gradient. The styles are in `UserList.css` and `App.css`.

## Tests

`src/App.test.js` replaces axios with a fake (`jest.mock('axios')`), so the tests don't need the internet. It checks that the users are shown after loading, that the search filters the list, and that the error message appears if the request fails. Axios 1.x is published as an ES module, which the Jest version inside create-react-app can't read, so `package.json` has a `moduleNameMapper` that points Jest to axios's CommonJS build.
