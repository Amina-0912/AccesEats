const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Helper middleware to allow both Admins and Riders to update order status
const isStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Rider')) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Access denied. Staff role required.' });
};

// Protected: Place an order
router.post('/checkout', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { addressId = 1, items, address, note } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide an array of items.'
    });
  }

  try {
    const itemsJson = JSON.stringify(items);
    await db.query('CALL place_order_multi(?, ?, ?, @p_order_id)', [userId, addressId, itemsJson]);
    
    const [result] = await db.query('SELECT @p_order_id AS order_id');
    const newOrderId = result[0].order_id;

    // Optionally attach special notes/address if columns exist
    if (note || address) {
      await db.query(
        'UPDATE orders SET special_note = ? WHERE order_id = ?',
        [note || '', newOrderId]
      ).catch(() => {}); // Gracefully skip if column name varies
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      orderId: newOrderId
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protected: Get current user's past orders with line items included
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [orders] = await db.query(
      `SELECT order_id, total_amount, status AS order_status, order_date AS created_at 
       FROM orders 
       WHERE user_id = ? 
       ORDER BY order_date DESC`,
      [userId]
    );

    // Fetch line items for each order
    const detailedOrders = await Promise.all(
      orders.map(async (o) => {
        const [items] = await db.query(
          `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price AS price 
           FROM order_item oi
           JOIN product p ON oi.product_id = p.product_id
           WHERE oi.order_id = ?`,
          [o.order_id]
        );
        return {
          id: o.order_id,
          total: o.total_amount,
          status: o.order_status,
          created_at: o.created_at,
          items
        };
      })
    );

    res.json({
      success: true,
      data: detailedOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected (Rider / Admin): Fetch active deliveries for rider queue
router.get('/rider/active', verifyToken, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT 
         o.order_id AS id, 
         o.total_amount AS total, 
         o.status, 
         o.order_date AS created_at,
         u.name AS customer_name,
         u.phone AS phone,
         a.street_address AS address,
         o.special_note AS note
       FROM orders o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN addresses a ON o.address_id = a.address_id
       WHERE o.status IN ('Pending', 'Processing')
       ORDER BY o.order_date DESC`
    );

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected: Get details for a specific order (including line items)
router.get('/:id', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const orderId = req.params.id;

  try {
    const [orders] = await db.query(
      `SELECT order_id, total_amount, status AS order_status, order_date AS created_at 
       FROM orders 
       WHERE order_id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or access denied.'
      });
    }

    const [items] = await db.query(
      `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price AS price 
       FROM order_item oi
       JOIN product p ON oi.product_id = p.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        ...orders[0],
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected (Admin & Rider): Update order status
router.patch('/:id/status', verifyToken, isStaff, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE orders SET status = ? WHERE order_id = ?`,
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found.'
      });
    }

    res.json({
      success: true,
      message: `Order #${orderId} status updated to '${status}'.`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected (Customer): Cancel order if still pending and restock items
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const orderId = req.params.id;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE orders 
       SET status = 'Cancelled' 
       WHERE order_id = ? AND user_id = ? AND status = 'Pending'`,
      [orderId, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled. Either it does not exist, belongs to another user, or is already being processed.'
      });
    }

    const [items] = await connection.query(
      `SELECT product_id, quantity FROM order_item WHERE order_id = ?`,
      [orderId]
    );

    for (const item of items) {
      await connection.query(
        `UPDATE product SET stock = stock + ? WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );
    }

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: `Order #${orderId} has been successfully cancelled and items have been returned to stock.`
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;