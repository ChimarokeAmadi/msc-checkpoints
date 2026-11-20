<script setup>
import { ref } from 'vue';
import { PRIORITIES } from '../../../shared/tasks.js';

const props = defineProps({ task: { type: Object, required: true } });
const emit = defineEmits(['update', 'remove']);

const editing = ref(false);
const name = ref('');
const priority = ref('');

function startEditing() {
  name.value = props.task.name;
  priority.value = props.task.priority;
  editing.value = true;
}

function save() {
  const clean = name.value.trim();
  if (!clean) return;
  emit('update', props.task.id, clean, priority.value);
  editing.value = false;
}
</script>

<template>
  <li v-if="editing" class="task editing">
    <form @submit.prevent="save">
      <input v-model="name" class="edit-name" aria-label="Task name" />
      <select v-model="priority" class="edit-priority" aria-label="Priority">
        <option v-for="p in PRIORITIES" :key="p" :value="p">{{ p }}</option>
      </select>
      <button class="save primary" type="submit">Save</button>
      <button class="cancel" type="button" @click="editing = false">Cancel</button>
    </form>
  </li>
  <li v-else class="task">
    <span :class="['prio', `prio-${task.priority}`]">{{ task.priority }}</span>
    <span class="name">{{ task.name }}</span>
    <button class="edit" @click="startEditing">Edit</button>
    <button class="delete" @click="emit('remove', task.id)">Delete</button>
  </li>
</template>
