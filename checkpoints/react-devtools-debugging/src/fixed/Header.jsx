// FIX #1: read the prop with the same name App sends ("title")
export default function Header({ title }) {
  return (
    <header className="header">
      <h1>{title}</h1>
      <p>Keep track of what you need to do</p>
    </header>
  );
}
