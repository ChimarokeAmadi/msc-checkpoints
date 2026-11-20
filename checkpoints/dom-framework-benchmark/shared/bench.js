// Times an operation the same way in every app: from the click until the
// browser has painted the result. requestAnimationFrame runs just before the
// next paint, and a setTimeout started from there runs just after it, so the
// time includes the framework's JavaScript, style, layout and paint.
//
// The result is written into #bench-result, which sits outside the app in
// index.html, so showing it doesn't make the framework render again.
export function measure(label, run) {
  const start = performance.now();
  run();
  requestAnimationFrame(() => {
    setTimeout(() => {
      const ms = performance.now() - start;
      const out = document.getElementById('bench-result');
      if (out) out.textContent = `${label}: ${ms.toFixed(1)} ms`;
    }, 0);
  });
}
