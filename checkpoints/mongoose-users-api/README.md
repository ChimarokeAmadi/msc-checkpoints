# Users REST API with Express and Mongoose

In this checkpoint I built a small REST API that manages users stored in MongoDB. Express handles the routes and Mongoose talks to the database. Each route uses a Mongoose method to read or change the data, then sends the result back as JSON.

## Folder structure

```
config/.env          the environment variables (PORT and MONGO_URI), not committed
config/.env.example  a copy without secrets, so you know what to put in .env
models/User.js       the User schema and model
server.js            the Express server and the four routes
local.js             runs the server with a temporary MongoDB (no install needed)
postman/             the Postman collection I used to test the routes
test/                automated tests for the routes
```

I put `config/.env` in `.gitignore`. If you connect to MongoDB Atlas, that file holds your password, and it should never end up on GitHub. `config/.env.example` shows what the file should contain.

## The User model

A user has a `name` (required), an `email` (required, unique, saved in lowercase) and an `age` (optional, can't be negative). With `timestamps: true`, Mongoose also adds `createdAt` and `updatedAt` by itself. Because of the schema, Mongoose refuses bad data before it reaches the database.

## The routes

| Method | URL | What it does | Mongoose method |
|---|---|---|---|
| GET | `/users` | returns all users | `User.find()` |
| POST | `/users` | adds a new user (JSON body) | `User.create()` |
| PUT | `/users/:id` | edits a user by id | `User.findByIdAndUpdate()` |
| DELETE | `/users/:id` | removes a user by id | `User.findByIdAndDelete()` |

I also made the errors clear. Invalid data returns **400** with the list of problems. An id that isn't a real MongoDB id also returns 400. A user that doesn't exist returns **404**, and an email that is already used returns **409**. For PUT, I used `runValidators: true` so the schema rules apply to updates too. Without it, you could set an age of -5 with an update. I also used `returnDocument: 'after'` so the response shows the user after the change.

## How to run it

```bash
npm install
cp config/.env.example config/.env   # then edit MONGO_URI if needed
npm start                            # uses the MongoDB in config/.env
```

If you don't have MongoDB installed, you can use this instead. It starts a temporary MongoDB in memory, and the data disappears when you stop it with Ctrl+C:

```bash
npm run local
```

The server runs on `http://localhost:3000`. If that port is busy, start it with another one, for example `PORT=3100 npm run local`.

## Testing with Postman

In Postman, go to **File → Import** and choose `postman/users-api.postman_collection.json`. It has the four routes in order, plus two error cases. The POST request saves the new user's id in a variable, so PUT and DELETE use it automatically. Each request also has a small test, so **Run collection** checks everything at once. If your server isn't on port 3000, change the `baseUrl` variable.

To send a request by hand, choose the method, type the URL, and for POST/PUT pick **Body → raw → JSON**:

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "age": 36 }
```

I also ran the collection from the terminal with Newman (Postman's command-line runner). All 6 requests and 10 checks passed, and the output is saved in `postman/newman-run.txt`.

## Automated tests

```bash
npm test
```

There are 9 tests. They start a temporary MongoDB and send real HTTP requests to the API. They check each route, the 400/404/409 errors, that a PUT only changes the fields you send, and that the data is really saved in or removed from the database.
