import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { cartCount, subscribeCart } from "./cart";
import { clearSession } from "./auth";
import "./Navbar.css";

const linkClass = ({ isActive }) => `nav__link${isActive ? " is-active" : ""}`;

export default function Navbar() {
  const navigate = useNavigate();
  const [count, setCount] = useState(cartCount);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isStaff = user.role === "Admin" || user.role === "Rider";

  useEffect(() => subscribeCart(() => setCount(cartCount())), []);

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <header className="nav">
      <Link to={user.role === "Admin" ? "/admin" : user.role === "Rider" ? "/rider" : "/menu"} className="nav__brand">
        <span>AccessEats {user.role ? `(${user.role})` : ""}</span>
      </Link>

      <nav className="nav__links" aria-label="Main">
        {user.role === "Admin" && <NavLink to="/admin" className={linkClass}>Admin Portal</NavLink>}
        {user.role === "Rider" && <NavLink to="/rider" className={linkClass}>Delivery Queue</NavLink>}

        {!isStaff && (
          <>
            <NavLink to="/menu" className={linkClass}>Menu</NavLink>
            <NavLink to="/cart" className={linkClass}>Cart ({count})</NavLink>
            <NavLink to="/orders" className={linkClass}>My Orders</NavLink>
          </>
        )}

        <button type="button" className="nav__logout" onClick={logout}>Logout</button>
      </nav>
    </header>
  );
}