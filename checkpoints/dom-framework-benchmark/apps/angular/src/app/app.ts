import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { PRIORITIES, buildTasks, createTask, editedName, nextPriority, pickEvenly } from '../../../../shared/tasks.js';
import { measure } from '../../../../shared/bench.js';
import { Task } from './task';
import { TaskRow } from './task-row';

@Component({
  selector: 'app-root',
  imports: [NgFor, NgIf, FormsModule, TaskRow],
  template: `
    <main class="app">
      <header>
        <h1>To-do <small>Angular</small></h1>
        <p class="count">{{ tasks.length }} {{ tasks.length === 1 ? 'task' : 'tasks' }}</p>
      </header>

      <form class="add" #addForm="ngForm" (ngSubmit)="addTask(addForm)">
        <input [(ngModel)]="name" name="name" placeholder="What needs doing?" aria-label="Task name" />
        <select [(ngModel)]="priority" name="priority" aria-label="Priority">
          <option *ngFor="let p of priorities" [value]="p">{{ p }}</option>
        </select>
        <button class="primary" type="submit">Add</button>
      </form>

      <section class="bench" aria-label="Benchmark">
        <span>Benchmark</span>
        <button id="bench-100" (click)="render(100)">Render 100</button>
        <button id="bench-500" (click)="render(500)">Render 500</button>
        <button id="bench-1000" (click)="render(1000)">Render 1000</button>
        <button id="bench-update" (click)="updateMany()">Update 50</button>
        <button id="bench-delete" (click)="removeMany()">Delete 50</button>
        <button id="bench-clear" (click)="clearAll()">Clear</button>
      </section>

      <p *ngIf="tasks.length === 0" class="empty">No tasks yet.</p>
      <ul *ngIf="tasks.length > 0" class="tasks">
        <li
          app-task-row
          *ngFor="let task of tasks; trackBy: trackById"
          [task]="task"
          (update)="updateTask($event)"
          (remove)="removeTask($event)"
        ></li>
      </ul>
    </main>
  `,
})
export class App {
  readonly priorities = PRIORITIES;
  tasks: Task[] = [];
  name = '';
  priority = 'medium';

  // Without trackBy, ngFor would match rows by object identity. With it,
  // Angular knows a row is "the same task" from its id and keeps its DOM.
  trackById(_index: number, task: Task) {
    return task.id;
  }

  addTask(form: NgForm) {
    const clean = this.name.trim();
    if (!clean) return;
    this.tasks = [...this.tasks, createTask(clean, this.priority)];
    // Reset through the form instead of only writing this.name = ''. If the
    // user types and presses Enter before Angular has checked the page again,
    // ngModel still thinks the input is '' and wouldn't clear it.
    form.resetForm({ name: '', priority: this.priority });
  }

  updateTask(change: Task) {
    const task = this.tasks.find((t) => t.id === change.id);
    if (!task) return;
    task.name = change.name;
    task.priority = change.priority;
  }

  removeTask(id: number) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  render(count: number) {
    measure(`Render ${count}`, () => {
      this.tasks = buildTasks(count);
    });
  }

  updateMany() {
    measure('Update 50', () => {
      for (const task of pickEvenly(this.tasks)) {
        task.name = editedName(task.name);
        task.priority = nextPriority(task.priority);
      }
    });
  }

  removeMany() {
    measure('Delete 50', () => {
      const ids = new Set(pickEvenly(this.tasks).map((t) => t.id));
      this.tasks = this.tasks.filter((t) => !ids.has(t.id));
    });
  }

  clearAll() {
    measure('Clear', () => {
      this.tasks = [];
    });
  }
}
