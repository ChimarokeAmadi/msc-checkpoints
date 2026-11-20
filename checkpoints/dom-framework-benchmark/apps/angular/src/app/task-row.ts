import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PRIORITIES } from '../../../../shared/tasks.js';
import { Task } from './task';

// The selector is an attribute on <li>, so the component doesn't add an extra
// element around each row: the DOM is the same as in the other three apps.
@Component({
  selector: 'li[app-task-row]',
  imports: [NgFor, NgIf, FormsModule],
  host: { class: 'task', '[class.editing]': 'editing' },
  template: `
    <ng-container *ngIf="!editing; else editForm">
      <span class="prio prio-{{ task.priority }}">{{ task.priority }}</span>
      <span class="name">{{ task.name }}</span>
      <button class="edit" (click)="startEditing()">Edit</button>
      <button class="delete" (click)="remove.emit(task.id)">Delete</button>
    </ng-container>
    <ng-template #editForm>
      <form (ngSubmit)="save()">
        <input [(ngModel)]="name" name="name" class="edit-name" aria-label="Task name" />
        <select [(ngModel)]="priority" name="priority" class="edit-priority" aria-label="Priority">
          <option *ngFor="let p of priorities" [value]="p">{{ p }}</option>
        </select>
        <button class="save primary" type="submit">Save</button>
        <button class="cancel" type="button" (click)="editing = false">Cancel</button>
      </form>
    </ng-template>
  `,
})
export class TaskRow {
  @Input({ required: true }) task!: Task;
  @Output() update = new EventEmitter<Task>();
  @Output() remove = new EventEmitter<number>();

  readonly priorities = PRIORITIES;
  editing = false;
  name = '';
  priority = '';

  startEditing() {
    this.name = this.task.name;
    this.priority = this.task.priority;
    this.editing = true;
  }

  save() {
    const clean = this.name.trim();
    if (!clean) return;
    this.update.emit({ id: this.task.id, name: clean, priority: this.priority });
    this.editing = false;
  }
}
