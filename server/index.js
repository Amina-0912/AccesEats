const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');

// Import Middleware
const { verifyToken, requireRole } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Import Route Handlers
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const addressRoutes = require('./routes/addresses');
const adminRoutes = require('./routes/admin');
const riderRoutes = require('./routes/rider');

const app = express();

// Middleware Configuration
app.use(cors());
app.use(express.json());

// Uploaded product photos are served from /uploads/<file>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/', (req, res) => {
  res.send('AccessEats API is running!');
});

// Mount modular routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rider', riderRoutes);

// Fallback mounts without /api prefix (prevents 404s if Axios baseURL omits /api)
app.use('/orders', orderRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/rider', riderRoutes);

// Public: Fetch all products (with their photos, cover first)
app.get('/api/products', async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT p.product_id, p.name, p.price, p.stock, c.name AS category
      FROM PRODUCT p
      JOIN CATEGORY c ON p.category_id = c.category_id
    `);

    // PRODUCT_IMAGE is created by routes/admin.js; if it isn't there yet, show no photos
    const [imgs] = await db
      .query('SELECT product_id, url FROM PRODUCT_IMAGE ORDER BY sort_order, image_id')
      .catch(() => [[]]);

    const data = rows.map((r) => ({
      ...r,
      images: imgs.filter((i) => i.product_id === r.product_id).map((i) => i.url)
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Protected (Admin Only): Category revenue report
app.get('/api/reports/category-revenue', verifyToken, requireRole('Admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM view_revenue_per_category');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Centralized Error Handling Middleware (MUST BE LAST)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AccessEats Server running on http://localhost:${PORT}`);
  console.log('✅ All routes and central error handling initialized!');
});