// components/StatusBadge.jsx
// The order status as a small coloured label (the word is always written,
// so the colour is never the only clue)

export default function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{status[0].toUpperCase() + status.slice(1)}</span>;
}
