import { useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Cart from './pages/Cart';
import { useCart } from './context/CartContext';
import AdminDashboard from './pages/AdminDashboard';
import RiderDashboard from './pages/RiderDashboard';
import Splash from './pages/Splash';
import RiderOrderDetails from "./pages/RiderOrderDetails";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { cart } = useCart();
  const totalCartCount = cart ? cart.reduce((sum, item) => sum + item.quantity, 0) : 0;

  // Hide navbar on the splash page and on the rider screens (they have their own header)
  if (location.pathname === '/' || location.pathname.startsWith('/rider') || location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.body.className = 'accessibility-none';
    navigate('/login');
  };

  const isStaff = user.role === 'Admin' || user.role === 'Rider';

  return (
    <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem', alignItems: 'center' }}>
      {/* Show Customer links ONLY when not an Admin or Rider */}
      {!isStaff && (
        <>
          <Link to="/menu">Menu</Link>
          <Link to="/cart">Cart ({totalCartCount})</Link>
        </>
      )}

      {/* Staff Portal Links */}
      {user.role === 'Admin' && (
        <Link to="/admin" style={{ color: '#3aa43a', fontWeight: 'bold' }}>🛠️ Admin Portal</Link>
      )}

      {user.role === 'Rider' && (
        <Link to="/rider" style={{ color: '#3aa43a', fontWeight: 'bold' }}>🚴 Rider Queue</Link>
      )}

      {token ? (
        <>
          {/* Show My Orders ONLY for Customers */}
          {!isStaff && <Link to="/orders">My Orders</Link>}

          <button onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</button>
        </>
      ) : (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      )}
    </nav>
  );
}

function App() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Dynamically apply accessibility theme class to body
  useEffect(() => {
    if (user && user.accessibility_type) {
      document.body.className = `accessibility-${user.accessibility_type}`;
    } else {
      document.body.className = 'accessibility-none';
    }
  }, [user.accessibility_type]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, padding: location.pathname === '/' ? '0' : '1rem' }}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/rider" element={<RiderDashboard />} />
          <Route path="/rider/orders/:id" element={<RiderOrderDetails />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;