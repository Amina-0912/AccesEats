const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// Protected: Get all addresses for logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [addresses] = await db.query(
      `SELECT address_id, street, city, pincode 
       FROM address 
       WHERE user_id = ?`,
      [userId]
    );

    res.json({ success: true, data: addresses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected: Add a new delivery address
router.post('/', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const { street, city, pincode } = req.body;

  if (!street || !city || !pincode) {
    return res.status(400).json({
      success: false,
      error: 'Please provide street, city, and pincode.'
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO address (user_id, street, city, pincode) 
       VALUES (?, ?, ?, ?)`,
      [userId, street, city, pincode]
    );

    res.status(201).json({
      success: true,
      message: 'Address added successfully!',
      addressId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;