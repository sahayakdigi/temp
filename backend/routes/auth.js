import pool from '../db.js';
import bcrypt from 'bcrypt';
import express from 'express';

const router = express.Router();
const SALT_ROUNDS = 10;

// ── POST /api/auth/login ──────────────────────────────────────
// Body: { email }
// Returns: { user } or 401
router.post('/login', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, branch, branch_label, avatar, designation, phone, party_id
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User profile not found in database.' });
    }

    const user = result.rows[0];
    return res.json({ user: { ...user, branchLabel: user.branch_label, partyId: user.party_id } });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /api/auth/users ───────────────────────────────────────
// Returns all users (admin only in production — here for demo)
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, branch, branch_label, avatar, designation, phone
       FROM users ORDER BY id`
    );
    res.json(result.rows.map(u => ({ ...u, branchLabel: u.branch_label })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ── POST /api/auth/users ──────────────────────────────────────
// Create a new user (admin function)
router.post('/users', async (req, res) => {
  const { name, email, password, role, branch, branchLabel, avatar, designation, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required.' });
  }
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, branch, branch_label, avatar, designation, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, role, branch, branch_label, avatar, designation, phone`,
      [name, email.toLowerCase().trim(), hash, role, branch || 'HO', branchLabel || 'Head Office', avatar || initials, designation || role, phone || null]
    );
    const u = result.rows[0];
    res.status(201).json({ ...u, branchLabel: u.branch_label });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists.' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// ── PATCH /api/auth/settings ──────────────────────────────────
// Body: { userId, name, email, phone, oldPassword, newPassword }
router.patch('/settings', async (req, res) => {
  const { userId, name, email, phone, oldPassword, newPassword } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentUser = userRes.rows[0];

    // Validate email duplication if changing
    if (email && email.toLowerCase().trim() !== currentUser.email.toLowerCase()) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2',
        [email.trim(), userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email is already taken by another account.' });
      }
    }

    let passwordHash = currentUser.password_hash;

    // Handle password change if newPassword is provided
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Current password is required to change password.' });
      }

      const match = await bcrypt.compare(oldPassword, currentUser.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Incorrect current password.' });
      }

      passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    // Update profile
    const updateRes = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           password_hash = $4
       WHERE id = $5
       RETURNING id, name, email, role, branch, branch_label, avatar, designation, phone, party_id`,
      [
        name || currentUser.name,
        email ? email.toLowerCase().trim() : currentUser.email,
        phone !== undefined ? phone : currentUser.phone,
        passwordHash,
        userId
      ]
    );

    const updatedUser = updateRes.rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: { ...updatedUser, branchLabel: updatedUser.branch_label, partyId: updatedUser.party_id }
    });

  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

export default router;
