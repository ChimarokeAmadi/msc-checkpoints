// Shared by both stores: turn "possible rides" into the final answer.
//
// A loop route can pass stop A (or B) twice, so one trip can give several
// possible rides. For each trip we keep the ride that arrives first and, if
// there is a tie, the one that boards LATEST (same arrival, shorter ride).
// Then the trips are sorted by arrival time.
function bestJourneys(rides, limit) {
  const best = new Map();
  for (const r of rides) {
    const cur = best.get(r.trip_id);
    if (!cur || r.arr < cur.arr || (r.arr === cur.arr && r.dep > cur.dep)) best.set(r.trip_id, r);
  }
  return [...best.values()]
    .sort((a, b) => a.arr - b.arr || a.dep - b.dep || a.trip_id.localeCompare(b.trip_id))
    .slice(0, limit);
}

module.exports = { bestJourneys };

// For "search stops by name": every word of the name starts a search key, so
// "sawt" finds "OLYMPIC WB & SAWTELLE NS". ("olympic wb & sawtelle ns",
// "wb & sawtelle ns", "sawtelle ns", "ns")
function searchKeys(name) {
  const words = name.toLowerCase().split(/\s+/).filter(Boolean);
  const keys = [];
  words.forEach((w, i) => {
    if (/^[a-z0-9]/.test(w)) keys.push(words.slice(i).join(' '));
  });
  return [...new Set(keys)];
}

const byName = (a, b) => a.name.localeCompare(b.name) || a.stop_id.localeCompare(b.stop_id);

module.exports.searchKeys = searchKeys;
module.exports.byName = byName;
