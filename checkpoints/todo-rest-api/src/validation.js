// Checks the data sent by the client. Each function returns { value } or { errors }.

const MAX_TITLE_LENGTH = 200;
const ALLOWED_FIELDS = ['title', 'completed'];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkTitle(title, errors) {
  if (typeof title !== 'string' || title.trim() === '') {
    errors.push('"title" is required and must be a non-empty string');
  } else if (title.trim().length > MAX_TITLE_LENGTH) {
    errors.push(`"title" must be at most ${MAX_TITLE_LENGTH} characters`);
  }
}

function checkCompleted(completed, errors) {
  if (typeof completed !== 'boolean') {
    errors.push('"completed" must be true or false');
  }
}

function checkUnknownFields(body, errors) {
  const unknown = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unknown.length > 0) {
    errors.push(`unknown field(s): ${unknown.join(', ')}. Allowed: ${ALLOWED_FIELDS.join(', ')}`);
  }
}

/**
 * POST and PUT need a full task: a title, and optionally "completed" (default false).
 */
export function validateFullTodo(body) {
  if (!isPlainObject(body)) return { errors: ['the request body must be a JSON object'] };

  const errors = [];
  checkUnknownFields(body, errors);
  checkTitle(body.title, errors);
  if (body.completed !== undefined) checkCompleted(body.completed, errors);
  if (errors.length > 0) return { errors };

  return { value: { title: body.title.trim(), completed: body.completed ?? false } };
}

/**
 * PATCH changes only some fields, but it must change at least one.
 */
export function validatePartialTodo(body) {
  if (!isPlainObject(body)) return { errors: ['the request body must be a JSON object'] };

  const errors = [];
  checkUnknownFields(body, errors);
  if (body.title !== undefined) checkTitle(body.title, errors);
  if (body.completed !== undefined) checkCompleted(body.completed, errors);
  if (body.title === undefined && body.completed === undefined) {
    errors.push('send at least one field to update: "title" or "completed"');
  }
  if (errors.length > 0) return { errors };

  const value = {};
  if (body.title !== undefined) value.title = body.title.trim();
  if (body.completed !== undefined) value.completed = body.completed;
  return { value };
}

/** "/todos/42" -> 42. Only positive whole numbers are valid ids. */
export function parseId(text) {
  return /^[1-9]\d*$/.test(text) ? Number(text) : null;
}
