// BUG #1: App passes a prop called "title", but this reads "heading",
// which doesn't exist, so the <h1> is empty.
export default function Header({ heading }) {
  return (
    <header className="header">
      <h1>{heading}</h1>
      <p>Keep track of what you need to do</p>
    </header>
  );
}
