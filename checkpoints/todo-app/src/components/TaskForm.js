import React, { useState } from 'react';

const emptyTask = { name: '', description: '', priority: 'medium', dueDate: '' };

/**
 * TaskForm is used both for adding a new task and for editing an existing one.
 * - With no `initialTask`, it starts empty and the button says "Add task".
 * - With an `initialTask`, the fields are pre-filled and the button says "Save".
 * Both name and description must be filled in before the form can be submitted.
 */
function TaskForm({ initialTask, onSubmit, onCancel }) {
  const isEditing = Boolean(initialTask);
  const [form, setForm] = useState({ ...emptyTask, ...initialTask });
  const [errors, setErrors] = useState({});

  // Update one field and clear its error as soon as the user starts typing
  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // Returns an object with an error message for each invalid field
  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Task name is required.';
    }
    if (!form.description.trim()) {
      newErrors.description = 'Description is required.';
    }
    return newErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      priority: form.priority,
      dueDate: form.dueDate,
    });

    // After adding, clear the form so the next task can be typed in
    if (!isEditing) {
      setForm(emptyTask);
    }
  };

  return (
    <form className={`task-form ${isEditing ? 'editing' : ''}`} onSubmit={handleSubmit} noValidate>
      {!isEditing && <h2>Add a new task</h2>}

      <label>
        Task name
        <input
          type="text"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="e.g. Finish React checkpoint"
          className={errors.name ? 'invalid' : ''}
          autoFocus={isEditing}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </label>

      <label>
        Description
        <textarea
          rows="2"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="What needs to be done?"
          className={errors.description ? 'invalid' : ''}
        />
        {errors.description && <span className="error">{errors.description}</span>}
      </label>

      <div className="form-row">
        <label>
          Priority
          <select value={form.priority} onChange={(event) => updateField('priority', event.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label>
          Due date (optional)
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => updateField('dueDate', event.target.value)}
          />
        </label>
      </div>

      <div className="form-buttons">
        <button type="submit" className="primary-button">
          {isEditing ? 'Save' : 'Add task'}
        </button>
        {onCancel && (
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default TaskForm;
