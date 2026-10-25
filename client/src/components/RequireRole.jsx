import { Navigate, Outlet } from "react-router-dom";
import { getRole, homeForRole, isLoggedIn } from "./auth";

/*
  Wrap routes with this so each role only sees its own screens:
  <Route element={<RequireRole allow={["customer"]} />}> ...routes... </Route>
*/
export default function RequireRole({ allow }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  const role = getRole();
  if (!allow.includes(role)) return <Navigate to={homeForRole(role)} replace />;

  return <Outlet />;
}