const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All rider routes require authentication and Rider role
router.use(verifyToken, requireRole('Rider'));

// Finds the RIDER row for the logged-in user (creates it the first time)
async function getRiderId(userId) {
  const [rows] = await db.query('SELECT rider_id FROM RIDER WHERE user_id = ?', [userId]);
  if (rows.length) return rows[0].rider_id;
  const [result] = await db.query(
    'INSERT INTO RIDER (user_id, vehicle_no) VALUES (?, ?)',
    [userId, `PENDING-${userId}`]
  );
  return result.insertId;
}

// 0. Update availability status (Online / Offline)
router.patch('/availability', async (req, res, next) => {
  try {
    const { available } = req.body;
    const userId = req.user.userId;

    await db.query(
      'UPDATE RIDER SET is_online = ? WHERE user_id = ?',
      [available ? 1 : 0, userId]
    ).catch(async () => {
      await db.query('UPDATE USERS SET is_online = ? WHERE user_id = ?', [available ? 1 : 0, userId]);
    });

    res.json({ success: true, message: `Availability updated to ${available ? 'Online' : 'Offline'}` });
  } catch (error) {
    next(error);
  }
});

// 1. Active deliveries (plus today's delivered ones) for the logged-in rider
const manifestSql = (noteExpr) => `
  SELECT dm.manifest_id, dm.status, dm.instructions, dm.delivered_at,
         o.order_id, o.total_amount, ${noteExpr} AS note,
         a.street, a.city, a.pincode,
         u.name AS customer_name, u.phone AS customer_phone
  FROM DELIVERY_MANIFEST dm
  JOIN ORDERS o ON dm.order_id = o.order_id
  JOIN ADDRESS a ON o.address_id = a.address_id
  JOIN USERS u ON o.user_id = u.user_id
  WHERE dm.rider_id = ?
    AND (dm.status <> 'Delivered' OR DATE(dm.delivered_at) = CURDATE())
  ORDER BY dm.manifest_id DESC
`;

router.get('/manifests', async (req, res, next) => {
  try {
    const riderId = await getRiderId(req.user.userId);

    let rows;
    try {
      [rows] = await db.query(manifestSql('o.special_note'), [riderId]);
    } catch (err) {
      // the ORDERS table has no special_note column: run it again without it
      if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
      [rows] = await db.query(manifestSql('NULL'), [riderId]);
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// 2. Update delivery status ('Picked Up' or 'Delivered')
router.patch('/manifests/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const manifestId = req.params.id;

    if (!['Picked Up', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, error: "Status must be 'Picked Up' or 'Delivered'." });
    }

    const riderId = await getRiderId(req.user.userId);
    const deliveredAt = status === 'Delivered' ? new Date() : null;

    const [result] = await db.query(
      'UPDATE DELIVERY_MANIFEST SET status = ?, delivered_at = ? WHERE manifest_id = ? AND rider_id = ?',
      [status, deliveredAt, manifestId, riderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Delivery not found for this rider.' });
    }

    if (status === 'Delivered') {
      const [manifest] = await db.query('SELECT order_id FROM DELIVERY_MANIFEST WHERE manifest_id = ?', [manifestId]);
      if (manifest.length > 0) {
        await db.query('UPDATE ORDERS SET status = ? WHERE order_id = ?', ['Delivered', manifest[0].order_id]);
      }
    }

    res.json({ success: true, message: `Delivery status updated to ${status}` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;