# To-Do List REST API

This is the backend for a to-do list, built with **only Node.js core modules**: the built-in `http` module, with no Express and no database. The tasks are stored in an array in memory, so they're reset every time the server restarts. Each task has a unique `id`, a `title`, and a `completed` status that is `false` by default.

## How to run it

You need Node.js 18 or newer. There's nothing to install.

```bash
node server.js            # starts on http://localhost:3000
PORT=4000 node server.js  # or on another port
npm test                  # runs the 13 tests
```

Every request is logged in the terminal with its status code, for example `POST /todos -> 201 (2 ms)`.

## The routes

| Method | Route | What it does | Success |
|---|---|---|---|
| GET | `/todos` | List all tasks. Add `?completed=true` or `?completed=false` to filter. | 200 |
| POST | `/todos` | Create a task. `title` is required, `completed` is optional (default `false`). | 201 + `Location` header |
| GET | `/todos/:id` | Get one task | 200 |
| PUT | `/todos/:id` | Replace a task. `title` is required, and `completed` goes back to `false` if you don't send it. | 200 |
| PATCH | `/todos/:id` | Update only the fields you send (`title` and/or `completed`) | 200 |
| DELETE | `/todos/:id` | Delete a task | 204 (no body) |

I followed REST conventions. The URL names the resource (`/todos` is the collection, `/todos/3` is one task), and the HTTP method says what to do with it. There's both PUT (replace the whole task) and PATCH (change part of it), because ticking a task as done shouldn't require sending its title again.

## Status codes and errors

Errors always come back as JSON in the same shape, so the client can handle them in one place:

```json
{ "error": { "status": 400, "message": "Validation failed",
             "details": ["\"title\" is required and must be a non-empty string"] } }
```

| Code | When |
|---|---|
| 200 OK | A task or list was read or updated |
| 201 Created | A task was created. The `Location` header gives its URL. |
| 204 No Content | A task was deleted |
| 400 Bad Request | Invalid JSON, empty body, missing or empty title, title over 200 characters, `completed` not a boolean, unknown fields, an invalid id like `/todos/abc`, or a bad `?completed=` value |
| 404 Not Found | No task with that id, or the route doesn't exist |
| 405 Method Not Allowed | For example `DELETE /todos`. The `Allow` header lists the methods that are allowed. |
| 413 Payload Too Large | The body is bigger than 10 KB |
| 415 Unsupported Media Type | The body isn't sent as `application/json` |
| 500 Internal Server Error | An unexpected bug (logged on the server, without the details sent to the client) |

Validation checks every field and returns *all* the problems at once, not just the first one. Titles are trimmed, so `"  Buy milk "` is saved as `"Buy milk"`. Ids are never reused, even after a task is deleted.

## Trying it with curl

```bash
# create
curl -i -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title": "Buy milk"}'
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title": "Finish the checkpoint", "completed": true}'

# read
curl http://localhost:3000/todos
curl "http://localhost:3000/todos?completed=false"
curl http://localhost:3000/todos/1

# update
curl -X PATCH http://localhost:3000/todos/1 -H "Content-Type: application/json" -d '{"completed": true}'
curl -X PUT http://localhost:3000/todos/1 -H "Content-Type: application/json" -d '{"title": "Buy oat milk"}'

# delete
curl -i -X DELETE http://localhost:3000/todos/1

# errors
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title": ""}'
curl -i -X DELETE http://localhost:3000/todos
```

The same requests work in Postman or Thunder Client.

## How the code is organised

- `server.js` creates the HTTP server and starts listening.
- `src/app.js` has the routing table and the handler for each route.
- `src/http-helpers.js` reads and parses the JSON body (with the size and content-type checks) and sends JSON responses and errors.
- `src/validation.js` checks the data for create, replace and update, and parses ids.
- `src/store.js` is the in-memory array with list, find, create, update and remove.
- `test/api.test.js` starts the server on a random port and tests every route and error case with real HTTP requests.
