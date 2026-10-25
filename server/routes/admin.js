const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All admin routes require authentication and Admin role
router.use(verifyToken, requireRole('Admin'));

/* ================= photo uploads ================= */

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG or PNG photos are allowed.'));
  }
});

// Stores the photo list (the first photo, lowest sort_order, is the cover)
db.query(`
  CREATE TABLE IF NOT EXISTS PRODUCT_IMAGE (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    INDEX (product_id)
  )
`).catch((err) => console.warn('Could not create PRODUCT_IMAGE table:', err.message));

const removeFile = (url) => {
  if (!url) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {});
};

const attachImages = async (products) => {
  if (!products.length) return products;
  const [imgs] = await db.query(
    'SELECT image_id, product_id, url FROM PRODUCT_IMAGE WHERE product_id IN (?) ORDER BY sort_order, image_id',
    [products.map((p) => p.product_id)]
  );
  return products.map((p) => ({
    ...p,
    images: imgs.filter((i) => i.product_id === p.product_id).map((i) => ({ id: i.image_id, url: i.url }))
  }));
};

const pageParams = (req, defaultLimit) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
};

/* ================= dashboard ================= */

router.get('/stats', async (req, res, next) => {
  try {
    const [[totals]] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS orders
       FROM ORDERS WHERE status <> 'Cancelled'`
    );
    const [[m]] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN order_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN total_amount END), 0) AS rev_now,
        COALESCE(SUM(CASE WHEN order_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
                           AND order_date <  DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN total_amount END), 0) AS rev_prev,
        COALESCE(SUM(order_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')), 0) AS ord_now,
        COALESCE(SUM(order_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
                     AND order_date <  DATE_FORMAT(CURDATE(), '%Y-%m-01')), 0) AS ord_prev
      FROM ORDERS WHERE status <> 'Cancelled'
    `);
    const [[menu]] = await db.query(
      'SELECT COUNT(*) AS items, COUNT(DISTINCT category_id) AS categories FROM PRODUCT'
    );

    const change = (now, prev) => (Number(prev) > 0 ? ((Number(now) - Number(prev)) / Number(prev)) * 100 : null);

    res.json({
      success: true,
      data: {
        revenue: Number(totals.revenue),
        orders: Number(totals.orders),
        revenueChange: change(m.rev_now, m.rev_prev),
        ordersChange: change(m.ord_now, m.ord_prev),
        menuItems: Number(menu.items),
        categories: Number(menu.categories)
      }
    });
  } catch (error) {
    next(error);
  }
});

/* ================= menu manager ================= */

router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT category_id, name FROM CATEGORY ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// Paginated product list with photos
router.get('/products', async (req, res, next) => {
  try {
    const { page, limit, offset } = pageParams(req, 8);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM PRODUCT');
    const [rows] = await db.query(
      `SELECT p.product_id, p.name, p.price, p.stock, p.category_id, c.name AS category
       FROM PRODUCT p
       JOIN CATEGORY c ON p.category_id = c.category_id
       ORDER BY p.product_id
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    res.json({ success: true, data: await attachImages(rows), total, page, limit });
  } catch (error) {
    next(error);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const { category_id, name, price, stock } = req.body;
    const [result] = await db.query(
      'INSERT INTO PRODUCT (category_id, name, price, stock) VALUES (?, ?, ?, ?)',
      [category_id, name, price, stock || 0]
    );
    res.status(201).json({ success: true, message: 'Product created successfully', productId: result.insertId });
  } catch (error) {
    next(error);
  }
});

router.put('/products/:id', async (req, res, next) => {
  try {
    const { name, category_id, price, stock } = req.body;
    await db.query(
      `UPDATE PRODUCT
       SET name = COALESCE(?, name),
           category_id = COALESCE(?, category_id),
           price = COALESCE(?, price),
           stock = COALESCE(?, stock)
       WHERE product_id = ?`,
      [name ?? null, category_id ?? null, price ?? null, stock ?? null, req.params.id]
    );
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const [imgs] = await db.query('SELECT url FROM PRODUCT_IMAGE WHERE product_id = ?', [req.params.id]);
    await db.query('DELETE FROM PRODUCT WHERE product_id = ?', [req.params.id]);
    await db.query('DELETE FROM PRODUCT_IMAGE WHERE product_id = ?', [req.params.id]);
    imgs.forEach((i) => removeFile(i.url));
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        error: 'This item is part of past orders, so it can’t be deleted. Set its stock to 0 instead.'
      });
    }
    next(error);
  }
});

// Upload up to 3 photos per product (form field name: "photos")
router.post('/products/:id/images', (req, res, next) => {
  upload.array('photos', 3)(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    const files = req.files || [];
    try {
      const [[{ n, mx }]] = await db.query(
        'SELECT COUNT(*) AS n, COALESCE(MAX(sort_order), -1) AS mx FROM PRODUCT_IMAGE WHERE product_id = ?',
        [req.params.id]
      );
      if (n + files.length > 3) {
        files.forEach((f) => removeFile(f.filename));
        return res.status(400).json({ success: false, error: 'A product can have up to 3 photos.' });
      }
      let order = mx + 1;
      for (const f of files) {
        await db.query(
          'INSERT INTO PRODUCT_IMAGE (product_id, url, sort_order) VALUES (?, ?, ?)',
          [req.params.id, `/uploads/${f.filename}`, order++]
        );
      }
      res.status(201).json({ success: true, message: 'Photos uploaded' });
    } catch (error) {
      next(error);
    }
  });
});

router.delete('/products/:id/images/:imageId', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT url FROM PRODUCT_IMAGE WHERE image_id = ? AND product_id = ?',
      [req.params.imageId, req.params.id]
    );
    await db.query('DELETE FROM PRODUCT_IMAGE WHERE image_id = ? AND product_id = ?', [req.params.imageId, req.params.id]);
    if (rows.length) removeFile(rows[0].url);
    res.json({ success: true, message: 'Photo removed' });
  } catch (error) {
    next(error);
  }
});

/* ================= orders ================= */

const ORDER_STATUSES = ['Pending', 'Preparing', 'In Transit', 'Delivered'];

// Paginated orders (?status=Pending&page=1&limit=7) with the assigned rider and tab counts
router.get('/orders', async (req, res, next) => {
  try {
    const { page, limit, offset } = pageParams(req, 7);
    const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : null;
    const where = status ? 'WHERE o.status = ?' : '';
    const params = status ? [status] : [];

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ORDERS o ${where}`, params);

    const [rows] = await db.query(
      `SELECT o.order_id, o.total_amount, o.status, o.order_date,
              u.name AS customer_name, a.street, a.city, a.pincode,
              dm.rider_id, dm.status AS manifest_status, ru.name AS rider_name
       FROM ORDERS o
       JOIN USERS u ON o.user_id = u.user_id
       LEFT JOIN ADDRESS a ON o.address_id = a.address_id
       LEFT JOIN DELIVERY_MANIFEST dm ON dm.order_id = o.order_id
       LEFT JOIN RIDER r ON dm.rider_id = r.rider_id
       LEFT JOIN USERS ru ON r.user_id = ru.user_id
       ${where}
       ORDER BY o.order_date DESC, o.order_id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await db.query('SELECT status, COUNT(*) AS n FROM ORDERS GROUP BY status');
    const counts = { All: 0 };
    ORDER_STATUSES.forEach((s) => (counts[s] = 0));
    countRows.forEach((c) => {
      counts.All += Number(c.n);
      if (c.status in counts) counts[c.status] = Number(c.n);
    });

    res.json({ success: true, data: rows, total, page, limit, counts });
  } catch (error) {
    next(error);
  }
});

// Change an order's status from the dropdown
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }
    const [result] = await db.query('UPDATE ORDERS SET status = ? WHERE order_id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    res.json({ success: true, message: `Order #${req.params.id} is now ${status}` });
  } catch (error) {
    next(error);
  }
});

/* ================= riders ================= */

const riderSql = (onlineExpr) => `
  SELECT r.rider_id, u.name, ${onlineExpr} AS is_online,
         EXISTS(SELECT 1 FROM DELIVERY_MANIFEST dm
                WHERE dm.rider_id = r.rider_id AND dm.status = 'Picked Up') AS on_delivery
  FROM RIDER r
  JOIN USERS u ON r.user_id = u.user_id
  ORDER BY u.name
`;

// Riders with availability: Available / On delivery / Offline
router.get('/riders', async (req, res, next) => {
  try {
    // makes sure every Rider account has a RIDER row
    await db.query(`
      INSERT INTO RIDER (user_id, vehicle_no)
      SELECT user_id, CONCAT('PENDING-', user_id) FROM USERS
      WHERE role = 'Rider' AND user_id NOT IN (SELECT user_id FROM RIDER)
    `).catch((err) => console.warn('Could not auto-create RIDER rows:', err.message));

    let rows;
    try {
      [rows] = await db.query(riderSql('r.is_online'));
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
      [rows] = await db.query(riderSql('1')); // no is_online column: treat everyone as online
    }

    res.json({
      success: true,
      data: rows.map((r) => ({
        rider_id: r.rider_id,
        name: r.name,
        is_online: Boolean(r.is_online),
        on_delivery: Boolean(r.on_delivery)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Assign (or re-assign) a rider to an order
router.post('/orders/:id/assign', async (req, res, next) => {
  try {
    const { rider_id, instructions } = req.body;
    const order_id = req.params.id;

    if (!rider_id) {
      return res.status(400).json({ success: false, error: 'Please choose a rider.' });
    }

    const [existing] = await db.query('SELECT manifest_id FROM DELIVERY_MANIFEST WHERE order_id = ?', [order_id]);

    let manifestId;
    if (existing.length) {
      manifestId = existing[0].manifest_id;
      await db.query(
        "UPDATE DELIVERY_MANIFEST SET rider_id = ? WHERE order_id = ? AND status <> 'Delivered'",
        [rider_id, order_id]
      );
    } else {
      const [result] = await db.query(
        'INSERT INTO DELIVERY_MANIFEST (order_id, rider_id, instructions, status) VALUES (?, ?, ?, ?)',
        [order_id, rider_id, instructions || 'Standard delivery', 'Assigned']
      );
      manifestId = result.insertId;
    }

    await db.query("UPDATE ORDERS SET status = 'Preparing' WHERE order_id = ? AND status = 'Pending'", [order_id]);

    res.status(201).json({ success: true, message: 'Rider assigned successfully', manifestId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;