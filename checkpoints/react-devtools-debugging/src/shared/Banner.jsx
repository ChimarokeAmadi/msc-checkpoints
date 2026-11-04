// Small banner at the top so it's clear which version is open
export default function Banner({ version }) {
  return version === 'buggy' ? (
    <div className="banner buggy">
      Buggy version (before debugging). <a href="/">Open the fixed version →</a>
    </div>
  ) : (
    <div className="banner fixed">
      Fixed version (after debugging). <a href="/buggy.html">Open the buggy version →</a>
    </div>
  );
}
