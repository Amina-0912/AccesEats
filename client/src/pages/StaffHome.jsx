import { useNavigate } from "react-router-dom";
import AuthLayout, { IceCream, Leaf, Float } from "./AuthLayout";
import { clearSession, getUser } from "../components/auth";

const COPY = {
  admin: {
    title: "Admin dashboard",
    todo: [
      "Manage menu items and upload photos",
      "See and update every order",
      "Manage customers and riders",
    ],
  },
  rider: {
    title: "Rider dashboard",
    todo: [
      "See the orders assigned to you",
      "Update delivery status",
      "View your delivery history",
    ],
  },
};

export default function StaffHome({ role }) {
  const navigate = useNavigate();
  const user = getUser();
  const copy = COPY[role] || COPY.admin;

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <AuthLayout
      decor={
        <>
          <Float
            pos={{ top: "13%", right: "9%" }}
            size="clamp(52px, 6.4vw, 110px)"
            tilt={8}
            dx={14}
            dur={6.5}
          >
            <IceCream />
          </Float>
          <Float
            pos={{ bottom: "12%", left: "10%" }}
            size="clamp(30px, 3.6vw, 60px)"
            tilt={-75}
            dx={18}
            dur={5}
            delay={-2}
          >
            <Leaf />
          </Float>
        </>
      }
    >
      <h1 className="card__title">{copy.title}</h1>
      <p className="card__sub">
        Hi {user?.name || "there"}! You're logged in as {role}. This area is still being built.
      </p>

      <p className="card__sub" style={{ marginTop: "1.2rem", fontWeight: 700, opacity: 1 }}>
        Coming soon:
      </p>
      <ul
        style={{
          margin: "0.5rem 0 0",
          paddingLeft: "1.2rem",
          display: "grid",
          gap: "0.4rem",
          fontSize: "clamp(0.85rem, 1vw, 1rem)",
        }}
      >
        {copy.todo.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <div className="form">
        <button type="button" className="btn" onClick={logout}>
          Log out
        </button>
      </div>
    </AuthLayout>
  );
}