// The request handler: routing + the CRUD logic for /todos.
//
//   GET    /todos            list all tasks (optional ?completed=true|false)
//   POST   /todos            create a task          -> 201 Created + Location header
//   GET    /todos/:id        get one task
//   PUT    /todos/:id        replace a task (title required, completed defaults to false)
//   PATCH  /todos/:id        update some fields of a task
//   DELETE /todos/:id        delete a task          -> 204 No Content

import { createTodoStore } from './store.js';
import { validateFullTodo, validatePartialTodo, parseId } from './validation.js';
import { HttpError, sendJson, sendNoContent, sendError, readJsonBody } from './http-helpers.js';

export function createApp({ store = createTodoStore(), logger = console } = {}) {
  // ---------- Route handlers ----------

  function listTodos(req, res, url) {
    const completedParam = url.searchParams.get('completed');
    if (completedParam !== null && !['true', 'false'].includes(completedParam)) {
      throw new HttpError(400, 'Query parameter "completed" must be true or false');
    }
    const filter = completedParam === null ? {} : { completed: completedParam === 'true' };
    const todos = store.list(filter);
    sendJson(res, 200, { count: todos.length, todos });
  }

  async function createTodo(req, res) {
    const { value, errors } = validateFullTodo(await readJsonBody(req));
    if (errors) throw new HttpError(400, 'Validation failed', errors);
    const todo = store.create(value);
    sendJson(res, 201, todo, { Location: `/todos/${todo.id}` });
  }

  function getTodo(req, res, url, id) {
    sendJson(res, 200, findOr404(id));
  }

  async function replaceTodo(req, res, url, id) {
    findOr404(id);
    const { value, errors } = validateFullTodo(await readJsonBody(req));
    if (errors) throw new HttpError(400, 'Validation failed', errors);
    sendJson(res, 200, store.update(id, value));
  }

  async function updateTodo(req, res, url, id) {
    findOr404(id);
    const { value, errors } = validatePartialTodo(await readJsonBody(req));
    if (errors) throw new HttpError(400, 'Validation failed', errors);
    sendJson(res, 200, store.update(id, value));
  }

  function deleteTodo(req, res, url, id) {
    findOr404(id);
    store.remove(id);
    sendNoContent(res);
  }

  function findOr404(id) {
    const todo = store.find(id);
    if (!todo) throw new HttpError(404, `Task with id ${id} was not found`);
    return todo;
  }

  // ---------- Routing table ----------

  const routes = {
    collection: { GET: listTodos, POST: createTodo },
    item: { GET: getTodo, PUT: replaceTodo, PATCH: updateTodo, DELETE: deleteTodo },
  };

  /** Works out which route a path belongs to: "/todos" or "/todos/:id" */
  function matchRoute(pathname) {
    const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean); // "/todos/3/" -> ["todos", "3"]
    if (parts[0] !== 'todos' || parts.length > 2) return null;
    if (parts.length === 1) return { methods: routes.collection };

    const id = parseId(parts[1]);
    if (id === null) throw new HttpError(400, `"${parts[1]}" is not a valid task id (it must be a positive whole number)`);
    return { methods: routes.item, id };
  }

  // ---------- The handler given to http.createServer ----------

  return async function handleRequest(req, res) {
    const started = Date.now();
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    try {
      if (url.pathname === '/' && req.method === 'GET') {
        sendJson(res, 200, {
          name: 'To-Do List API',
          endpoints: ['GET /todos', 'POST /todos', 'GET /todos/:id', 'PUT /todos/:id', 'PATCH /todos/:id', 'DELETE /todos/:id'],
        });
        return;
      }

      const route = matchRoute(url.pathname);
      if (!route) throw new HttpError(404, `Route ${req.method} ${url.pathname} does not exist`);

      const handler = route.methods[req.method];
      if (!handler) {
        const allowed = Object.keys(route.methods).join(', ');
        sendError(res, 405, `Method ${req.method} is not allowed on ${url.pathname}`, undefined, { Allow: allowed });
        return;
      }

      await handler(req, res, url, route.id);
    } catch (error) {
      if (error instanceof HttpError) {
        sendError(res, error.status, error.message, error.details);
      } else {
        logger.error(error);
        sendError(res, 500, 'Internal server error');
      }
    } finally {
      logger.log(`${req.method} ${url.pathname}${url.search} -> ${res.statusCode} (${Date.now() - started} ms)`);
    }
  };
}
