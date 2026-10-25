const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../db');
const jwt = require('jsonwebtoken');
const validate = require('../middleware/validate');

// Register Route with Input Validation
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Please provide a valid email address.'),
    body('phone').notEmpty().withMessage('Phone number is required.'),
    body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters long.'),
    validate
  ],
  async (req, res) => {
    const { name, email, phone, password, role, accessibility_type } = req.body;

    try {
      const [existingUser] = await db.query(
        'SELECT user_id FROM USERS WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists.'
        });
      }

      const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Customer';
      const selectedAccessibility = accessibility_type || 'none';

      const [result] = await db.query(
        'INSERT INTO USERS (name, email, phone, password_hash, role, accessibility_type) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, phone || '000-000-0000', password, formattedRole, selectedAccessibility]
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully!',
        userId: result.insertId
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Login Route with Input Validation
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
    validate
  ],
  async (req, res) => {
    const { email, password } = req.body;

    try {
      // 1. Included accessibility_type in the SELECT query
      const [users] = await db.query(
        'SELECT user_id, name, email, password_hash, role, accessibility_type FROM USERS WHERE email = ?',
        [email]
      );

      if (users.length === 0 || users[0].password_hash !== password) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.'
        });
      }

      const user = users[0];
      const token = jwt.sign(
        { userId: user.user_id, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '2h' }
      );

      res.json({
        success: true,
        message: 'Login successful!',
        token,
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          accessibility_type: user.accessibility_type || 'none' // 2. Returned accessibility_type in user response
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;