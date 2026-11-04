export default function Stats({ tasks }) {
  // BUG #4: "=" instead of a check. This SETS done to true on every task
  // (changing the state objects during render) and counts them all.
  const completed = tasks.filter((t) => (t.done = true)).length;

  return (
    <p className="stats">
      {completed} of {tasks.length} tasks completed
    </p>
  );
}
