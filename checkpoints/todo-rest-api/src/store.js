// In-memory storage: the tasks live in an array, so they reset when the server restarts.

export function createTodoStore() {
  const todos = [];
  let nextId = 1;

  return {
    list(filter = {}) {
      return todos.filter((todo) => filter.completed === undefined || todo.completed === filter.completed);
    },

    find(id) {
      return todos.find((todo) => todo.id === id) ?? null;
    },

    create({ title, completed = false }) {
      const todo = { id: nextId++, title, completed, createdAt: new Date().toISOString() };
      todos.push(todo);
      return todo;
    },

    /** Changes only the given fields. Returns the updated task, or null if it doesn't exist. */
    update(id, changes) {
      const todo = this.find(id);
      if (!todo) return null;
      Object.assign(todo, changes, { updatedAt: new Date().toISOString() });
      return todo;
    },

    remove(id) {
      const index = todos.findIndex((todo) => todo.id === id);
      if (index === -1) return false;
      todos.splice(index, 1);
      return true;
    },
  };
}
