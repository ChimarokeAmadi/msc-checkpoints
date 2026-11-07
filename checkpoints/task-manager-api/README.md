# Secure Task Manager API

This is a REST API where people create an account (or log in with Google) and manage their own to-do tasks. This checkpoint was less about the tasks themselves and more about doing things *safely*. I used JWT authentication in an HTTP-only cookie, made sure nobody can touch someone else's tasks, sanitized all input, added rate limiting, and handled every error in one place.

It's built with Express, MongoDB (through Mongoose) and Passport.js for Google.

## Running it

```bash
npm install
npm start
```

The API runs at http://localhost:3000. You don't need anything else to try it. If there's no `MONGO_URI`, the server starts a temporary in-memory MongoDB, so the data disappears when you stop it. If there's no `JWT_SECRET`, it makes up a random one for that run. For real use, copy `.env.example` to `.env` and fill it in (a MongoDB Atlas connection string, a long random secret, and the Google keys).

To run the tests:

```bash
npm test
```

## Endpoints

| Method | Route | What it does | Login needed |
|---|---|---|---|
| POST | `/auth/signup` | Create an account (`name`, `email`, `password`) | no |
| POST | `/auth/login` | Log in (`email`, `password`) | no |
| GET | `/auth/google` | Log in with Google | no |
| POST | `/auth/logout` | Clear the cookie | no |
| GET | `/auth/me` | Who am I? | yes |
| POST | `/tasks` | Create a task (`title`, optional `description`) | yes |
| GET | `/tasks` | List **my** tasks, newest first | yes |
| GET | `/tasks/:id` | Get one of my tasks | yes |
| DELETE | `/tasks/:id` | Delete one of my tasks | yes |

Here's a quick try with curl. The `-c` and `-b` options save the cookie and send it back, like a browser does:

```bash
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"supersecret1"}' \
  http://localhost:3000/auth/signup

curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"title":"Finish the checkpoint"}' http://localhost:3000/tasks

curl -b cookies.txt http://localhost:3000/tasks
```

## How I did each part

### Authentication

On **signup**, the password is hashed with bcrypt (12 rounds) in a Mongoose `pre('save')` hook, so it's never stored as plain text. The password field also has `select: false`, so it's never returned by accident. On **login**, I compare the password with `bcrypt.compare`. If the email doesn't exist or the password is wrong, the message is the same ("Incorrect email or password"), so nobody can use the login form to find out who has an account.

After signup or login, I create a **JWT** with the user's id and put it in a cookie (`src/utils/token.js`). The cookie is:

- **httpOnly**: JavaScript in the browser can't read it, so an XSS attack can't steal the token.
- **secure**: only sent over HTTPS. Browsers and curl treat `http://localhost` as secure, so it still works locally.
- **sameSite: 'lax'**: the browser doesn't send it with POST or DELETE requests coming from other websites, which protects against CSRF. I didn't use `strict`, because then the cookie wouldn't come along after Google redirects you back to the site.

The token is *only* in the cookie, not in the response body.

The **`verifyToken`** middleware (`src/middleware/verifyToken.js`) protects the private routes. It reads the token from the cookie (or from an `Authorization: Bearer` header, which is easier in Postman). It checks the signature and expiry with `jwt.verify` and only accepts the HS256 algorithm. It also looks up the user in the database, because a valid token for a deleted account shouldn't still work. Then it puts the user on `req.user`. I use `router.use(verifyToken)` once at the top of the task routes, so every task route is protected.

### Google OAuth with Passport.js

`src/config/passport.js` sets up `passport-google-oauth20`. `GET /auth/google` sends you to Google's login page. Google then sends you back to `/auth/google/callback`, where Passport gets your profile. There are three cases:

1. You've used Google here before, so I find you by `googleId`.
2. You already signed up with the same email and a password, so I link the Google account to it instead of making a duplicate.
3. You're new, so I create a user without a password.

After that I set the same JWT cookie as a normal login. I used `session: false`, because the JWT does the job a session would normally do. Google accounts without a verified email are refused.

To turn it on:

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type "Web application".
2. Add `http://localhost:3000/auth/google/callback` as an **authorised redirect URI**.
3. Put the client ID and secret in `.env`.
4. Open http://localhost:3000/auth/google in the browser.

Without the keys, the Google routes answer with a clear 503 error instead of crashing.

### Task routes and ownership

Every task has an `owner` field, and it's **always** set from `req.user`, never from the request body. I tested that sending `"owner": "<someone else's id>"` is ignored. `GET /tasks` only returns tasks where `owner` is the logged-in user. For `GET` and `DELETE /tasks/:id`, a small helper (`findOwnTask`) does three checks in order:

1. Is the id a valid MongoDB id? If not, 400.
2. Does the task exist? If not, 404.
3. Does it belong to you? If not, **403 Forbidden**.

I picked 403 so it's clear the ownership check is working. Some APIs answer 404 here instead, to hide that the task exists at all.

### Security

All of this is set up in `src/app.js`, in this order:

- **helmet** adds security headers (Content-Security-Policy, HSTS, `X-Content-Type-Options: nosniff`, ...), and I turned off the `X-Powered-By: Express` header.
- **Rate limiting** with `express-rate-limit`: 100 requests per 15 minutes per IP for the whole API, and a much stricter **5 failed attempts per 15 minutes** on `/auth/login` and `/auth/signup`, to slow down password guessing. Successful logins don't count.
- `express.json({ limit: '10kb' })`, so nobody can send huge bodies.
- **express-mongo-sanitize** removes keys that start with `$` or contain `.`. Without it, logging in with `{"email": {"$ne": null}}` could match any user (NoSQL injection). My controllers also only accept strings for these fields, so this is blocked twice.
- **xss-clean** turns HTML like `<script>` in the input into harmless text before it gets saved.
- The schemas have length limits, and the controllers only pick the fields they expect.

**A note on versions:** I used **Express 4**, not 5. `xss-clean` and `express-mongo-sanitize` both overwrite `req.query`, which became read-only in Express 5, so they crash there. Also, `xss-clean` is marked as deprecated on npm. I still used it because the checkpoint asks for it, but in a real project I'd escape the output instead, or use a maintained library.

### Error handling

- **`AppError`** (`src/utils/AppError.js`) is my error class for *expected* problems, like `new AppError('Task not found', 404)`. It sets the status code, a `status` of `"fail"` (4xx) or `"error"` (5xx), and `isOperational = true`.
- **`catchAsync`** (`src/utils/catchAsync.js`) wraps every async handler. Express 4 doesn't notice errors thrown inside async functions, so the request would just hang. This sends them to `next()` instead, which means I don't need a try/catch in every controller.
- The **error-handling middleware** (`src/middleware/errorHandler.js`) is the last `app.use` and receives every error. It turns library errors into friendly AppErrors:

  | Error | Becomes |
  |---|---|
  | invalid MongoDB id | 400 |
  | Mongoose validation error | 400 with the messages |
  | duplicate email | 409 |
  | invalid or expired JWT | 401 |
  | broken JSON | 400 |
  | body too large | 413 |

  Every error response has the same shape: `{ "status": "fail", "message": "..." }`. If it's a real bug (not an AppError), the client only sees "Something went wrong", and the details are logged on the server. In development, the stack trace is also added to the response to help debugging. Unknown routes go through the same system as a 404.

## Tests

`test/api.test.js` has 19 tests using Node's built-in test runner, `supertest` and an in-memory MongoDB. They check:

- signup and login, including the cookie flags (`HttpOnly`, `Secure`, `SameSite`) and that the password is hashed
- that bad, expired, forged and missing tokens are all rejected
- that another user gets 403 on your task and doesn't see it in their list
- that the `owner` field can't be faked
- the helmet headers
- NoSQL injection and XSS
- that the 6th failed login gets a 429
- the error formats, and that a crash doesn't leak details
- Google: the redirect to Google, plus creating and linking accounts with fake Google profiles

I couldn't test a real Google login automatically, because it needs a real Google account in a browser.

## Project structure

```
src/
  app.js                 Express app: security middleware, routes, error handler
  server.js              connects to MongoDB and starts the server
  config/                settings, database connection, Passport Google strategy
  controllers/           auth and task logic
  middleware/            verifyToken, rate limiters, error handler
  models/                User and Task schemas
  routes/                /auth and /tasks routers
  utils/                 AppError, catchAsync, JWT cookie helpers
test/api.test.js
```
