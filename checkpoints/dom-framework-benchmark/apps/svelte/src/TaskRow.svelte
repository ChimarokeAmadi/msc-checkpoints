<script>
  import { PRIORITIES } from '../../../shared/tasks.js';

  let { task, onupdate, onremove } = $props();

  let editing = $state(false);
  let name = $state('');
  let priority = $state('');

  function startEditing() {
    name = task.name;
    priority = task.priority;
    editing = true;
  }

  function save(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onupdate(task.id, clean, priority);
    editing = false;
  }
</script>

{#if editing}
  <li class="task editing">
    <form onsubmit={save}>
      <input bind:value={name} class="edit-name" aria-label="Task name" />
      <select bind:value={priority} class="edit-priority" aria-label="Priority">
        {#each PRIORITIES as p (p)}
          <option value={p}>{p}</option>
        {/each}
      </select>
      <button class="save primary" type="submit">Save</button>
      <button class="cancel" type="button" onclick={() => (editing = false)}>Cancel</button>
    </form>
  </li>
{:else}
  <li class="task">
    <span class="prio prio-{task.priority}">{task.priority}</span>
    <span class="name">{task.name}</span>
    <button class="edit" onclick={startEditing}>Edit</button>
    <button class="delete" onclick={() => onremove(task.id)}>Delete</button>
  </li>
{/if}
