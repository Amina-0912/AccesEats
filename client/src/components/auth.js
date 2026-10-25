const TOKEN_KEY = "token";
const USER_KEY = "user";

/* where each role lands after logging in */
export const HOME = {
  customer: "/menu",
  rider: "/rider",
  admin: "/admin",
};

export const homeForRole = (role) => HOME[role] || HOME.customer;

/* reads the payload of a JWT (no verification, just for reading the role) */
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/* finds the role wherever your backend puts it */
function pickRole(data) {
  const u = data?.user ?? data?.data?.user ?? data?.data ?? {};
  const raw =
    u.role ??
    data?.role ??
    u.account_type ??
    data?.account_type ??
    u.accountType ??
    u.type ??
    decodeJwt(data?.token ?? data?.accessToken ?? data?.access_token ?? "")?.role;
  return String(raw || "").toLowerCase();
}

/*
  Call this with the login / register response.
  fallback = values from the form (used only if the response has no role / name)
  Returns the role.
*/
export function saveSession(data, fallback = {}) {
  const token = data?.token ?? data?.accessToken ?? data?.access_token;
  const user = data?.user ?? data?.data?.user ?? {};
  const role = pickRole(data) || String(fallback.role || "").toLowerCase();

  if (!role) {
    console.warn("AccessEats: couldn't find a role in the login response:", data);
  }

  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ name: fallback.name, ...user, role })
    );
  } catch {
    /* storage unavailable */
  }
  return role;
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken() || getUser());
}

export function getRole() {
  const r = String(getUser()?.role || decodeJwt(getToken() || "")?.role || "").toLowerCase();
  return HOME[r] ? r : "customer";
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}