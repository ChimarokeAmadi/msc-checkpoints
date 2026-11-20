<script setup>
import { ref } from 'vue';
import { PRIORITIES, buildTasks, createTask, editedName, nextPriority, pickEvenly } from '../../../shared/tasks.js';
import { measure } from '../../../shared/bench.js';
import TaskRow from './TaskRow.vue';

// ref() makes the array and every task in it reactive. Vue tracks which
// properties each row reads, so changing task.name only re-renders that row.
const tasks = ref([]);
const name = ref('');
const priority = ref('medium');

function addTask() {
  const clean = name.value.trim();
  if (!clean) return;
  tasks.value.push(createTask(clean, priority.value));
  name.value = '';
}

function updateTask(id, newName, newPriority) {
  const task = tasks.value.find((t) => t.id === id);
  if (!task) return;
  task.name = newName;
  task.priority = newPriority;
}

function removeTask(id) {
  tasks.value = tasks.value.filter((t) => t.id !== id);
}

function render(count) {
  measure(`Render ${count}`, () => {
    tasks.value = buildTasks(count);
  });
}

function updateMany() {
  measure('Update 50', () => {
    for (const task of pickEvenly(tasks.value)) {
      task.name = editedName(task.name);
      task.priority = nextPriority(task.priority);
    }
  });
}

function removeMany() {
  measure('Delete 50', () => {
    const ids = new Set(pickEvenly(tasks.value).map((t) => t.id));
    tasks.value = tasks.value.filter((t) => !ids.has(t.id));
  });
}

function clearAll() {
  measure('Clear', () => {
    tasks.value = [];
  });
}
</script>

<template>
  <main class="app">
    <header>
      <h1>To-do <small>Vue</small></h1>
      <p class="count">{{ tasks.length }} {{ tasks.length === 1 ? 'task' : 'tasks' }}</p>
    </header>

    <form class="add" @submit.prevent="addTask">
      <input v-model="name" placeholder="What needs doing?" aria-label="Task name" />
      <select v-model="priority" aria-label="Priority">
        <option v-for="p in PRIORITIES" :key="p" :value="p">{{ p }}</option>
      </select>
      <button class="primary" type="submit">Add</button>
    </form>

    <section class="bench" aria-label="Benchmark">
      <span>Benchmark</span>
      <button id="bench-100" @click="render(100)">Render 100</button>
      <button id="bench-500" @click="render(500)">Render 500</button>
      <button id="bench-1000" @click="render(1000)">Render 1000</button>
      <button id="bench-update" @click="updateMany">Update 50</button>
      <button id="bench-delete" @click="removeMany">Delete 50</button>
      <button id="bench-clear" @click="clearAll">Clear</button>
    </section>

    <p v-if="tasks.length === 0" class="empty">No tasks yet.</p>
    <ul v-else class="tasks">
      <TaskRow v-for="task in tasks" :key="task.id" :task="task" @update="updateTask" @remove="removeTask" />
    </ul>
  </main>
</template>
