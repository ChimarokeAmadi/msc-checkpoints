import React from 'react';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

/**
 * TaskFilters lets the user choose which tasks to see (all / active / completed)
 * and how to sort them (newest first, by priority, or by due date).
 * It also shows how many tasks are in each group.
 */
function TaskFilters({ filter, onFilterChange, sortBy, onSortChange, counts }) {
  return (
    <div className="task-filters">
      <div className="filter-buttons" role="group" aria-label="Filter tasks">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'selected' : ''}
            onClick={() => onFilterChange(value)}
          >
            {label} <span className="count">{counts[value]}</span>
          </button>
        ))}
      </div>

      <label className="sort-select">
        Sort by
        <select value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due date</option>
        </select>
      </label>
    </div>
  );
}

export default TaskFilters;
