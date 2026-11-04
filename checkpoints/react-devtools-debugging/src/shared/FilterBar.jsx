// Buttons to choose which tasks to show
const options = ['all', 'active', 'done'];

export default function FilterBar({ filter, onFilterChange }) {
  return (
    <div className="filter-bar">
      {options.map((option) => (
        <button
          key={option}
          className={filter === option ? 'active' : ''}
          onClick={() => onFilterChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
