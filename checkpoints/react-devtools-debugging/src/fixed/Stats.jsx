export default function Stats({ tasks }) {
  // FIX #4: only READ t.done. Rendering should never change props or state.
  const completed = tasks.filter((t) => t.done).length;

  return (
    <p className="stats">
      {completed} of {tasks.length} tasks completed
    </p>
  );
}
