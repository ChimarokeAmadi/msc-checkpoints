// A reusable repository that keeps entities in a Map.
// It implements the Repository interface, so it can be swapped for a
// database-backed one later without changing any service.

export class InMemoryRepository {
  #items = new Map();
  #entityName;

  constructor(entityName = 'Entity') {
    this.#entityName = entityName;
  }

  findById(id) {
    return this.#items.get(id) ?? null;
  }

  findAll(predicate = () => true) {
    return [...this.#items.values()].filter(predicate);
  }

  save(entity) {
    if (!entity?.id) throw new TypeError(`${this.#entityName} must have an id to be saved`);
    this.#items.set(entity.id, entity);
    return entity;
  }

  delete(id) {
    return this.#items.delete(id);
  }

  exists(id) {
    return this.#items.has(id);
  }

  get size() {
    return this.#items.size;
  }
}
