import Navbar from "./Navbar";
import "./PageShell.css";

/* Shared frame for Cart, Empty cart and My Orders:
   fixed navbar + gingham blanket + the beige panel with the page title. */
export default function PageShell({ title, children }) {
  return (
    <>
      <Navbar />
      <div className="shell">
        <main className="shell__panel">
          <h1 className="shell__title">{title}</h1>
          {children}
        </main>
      </div>
    </>
  );
}