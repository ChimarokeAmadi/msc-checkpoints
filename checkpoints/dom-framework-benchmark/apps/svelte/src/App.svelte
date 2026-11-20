<script>
  import { PRIORITIES, buildTasks, createTask, editedName, nextPriority, pickEvenly } from '../../../shared/tasks.js';
  import { measure } from '../../../shared/bench.js';
  import TaskRow from './TaskRow.svelte';

  // $state makes the list reactive. Svelte compiles the template into code
  // that updates exactly the text or attribute that depends on a value, so
  // there is no virtual DOM to compare.
  let tasks = $state([]);
  let name = $state('');
  let priority = $state('medium');

  function addTask(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    tasks.push(createTask(clean, priority));
    name = '';
  }

  function updateTask(id, newName, newPriority) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.name = newName;
    task.priority = newPriority;
  }

  function removeTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
  }

  function render(count) {
    measure(`Render ${count}`, () => {
      tasks = buildTasks(count);
    });
  }

  function updateMany() {
    measure('Update 50', () => {
      for (const task of pickEvenly(tasks)) {
        task.name = editedName(task.name);
        task.priority = nextPriority(task.priority);
      }
    });
  }

  function removeMany() {
    measure('Delete 50', () => {
      const ids = new Set(pickEvenly(tasks).map((t) => t.id));
      tasks = tasks.filter((t) => !ids.has(t.id));
    });
  }

  function clearAll() {
    measure('Clear', () => {
      tasks = [];
    });
  }
</script>

<main class="app">
  <header>
    <h1>To-do <small>Svelte</small></h1>
    <p class="count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</p>
  </header>

  <form class="add" onsubmit={addTask}>
    <input bind:value={name} placeholder="What needs doing?" aria-label="Task name" />
    <select bind:value={priority} aria-label="Priority">
      {#each PRIORITIES as p (p)}
        <option value={p}>{p}</option>
      {/each}
    </select>
    <button class="primary" type="submit">Add</button>
  </form>

  <section class="bench" aria-label="Benchmark">
    <span>Benchmark</span>
    <button id="bench-100" onclick={() => render(100)}>Render 100</button>
    <button id="bench-500" onclick={() => render(500)}>Render 500</button>
    <button id="bench-1000" onclick={() => render(1000)}>Render 1000</button>
    <button id="bench-update" onclick={updateMany}>Update 50</button>
    <button id="bench-delete" onclick={removeMany}>Delete 50</button>
    <button id="bench-clear" onclick={clearAll}>Clear</button>
  </section>

  {#if tasks.length === 0}
    <p class="empty">No tasks yet.</p>
  {:else}
    <ul class="tasks">
      {#each tasks as task (task.id)}
        <TaskRow {task} onupdate={updateTask} onremove={removeTask} />
      {/each}
    </ul>
  {/if}
</main>
