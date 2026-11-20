// Shared by the four apps, so every framework renders exactly the same data.

export const PRIORITIES = ['low', 'medium', 'high'];

const VERBS = ['Write', 'Review', 'Fix', 'Test', 'Plan', 'Refactor', 'Deploy', 'Document', 'Design', 'Update', 'Clean up', 'Check'];
const ADJECTIVES = ['urgent', 'small', 'old', 'new', 'tricky', 'boring', 'shared', 'broken', 'slow', 'ugly', 'secret', 'final'];
const NOUNS = ['login page', 'invoice', 'report', 'bug', 'API', 'database', 'README', 'sprint board', 'dashboard', 'test suite', 'email', 'backup'];

// A tiny seeded random generator: the same "random" names come out in every
// framework, so they all render the same text.
let seed = 1;
function random(max) {
  seed = (seed * 16807) % 2147483647;
  return seed % max;
}

let nextId = 1;

export function createTask(name, priority) {
  return { id: nextId++, name, priority };
}

export function buildTasks(count) {
  const tasks = new Array(count);
  for (let i = 0; i < count; i++) {
    const name = `${VERBS[random(VERBS.length)]} the ${ADJECTIVES[random(ADJECTIVES.length)]} ${NOUNS[random(NOUNS.length)]}`;
    tasks[i] = createTask(name, PRIORITIES[random(PRIORITIES.length)]);
  }
  return tasks;
}

// The benchmark updates or deletes 50 tasks spread across the whole list
// (with 1000 tasks: the 1st, 21st, 41st...), not just the first 50.
export function pickEvenly(tasks, count = 50) {
  const picked = [];
  if (tasks.length === 0) return picked;
  const step = Math.max(1, Math.floor(tasks.length / count));
  for (let i = 0; i < tasks.length && picked.length < count; i += step) picked.push(tasks[i]);
  return picked;
}

// What the "update 50" benchmark does to a task. It toggles, so running it
// twice brings the task back.
const MARK = ' (edited)';
export function editedName(name) {
  return name.endsWith(MARK) ? name.slice(0, -MARK.length) : name + MARK;
}

export function nextPriority(priority) {
  return PRIORITIES[(PRIORITIES.indexOf(priority) + 1) % PRIORITIES.length];
}
