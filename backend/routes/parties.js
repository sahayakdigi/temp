import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();
const SALT_ROUNDS = 10;

// Get all parties
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM parties ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a new party
router.post('/', async (req, res) => {
  const { id, name, type, gstin, credit_limit, credit_days, address, email, password } = req.body;
  if (!id || !name || !type) {
    return res.status(400).json({ error: 'ID, name, and type are required.' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const partyRes = await client.query(
      `INSERT INTO parties (id, name, type, gstin, credit_limit, credit_days, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, type, gstin || null, credit_limit || null, credit_days || null, address || null]
    );

    const newParty = partyRes.rows[0];

    // If email and password are provided, create a corresponding user
    if (email && password) {
      const passHash = await bcrypt.hash(password, SALT_ROUNDS);
      const avatarLetters = name.substring(0, 2).toUpperCase();
      
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, branch, branch_label, avatar, designation, party_id)
         VALUES ($1, $2, $3, 'Client', 'HO', 'Client Portal', $4, 'Client Admin', $5)`,
        [`${name} Admin`, email.toLowerCase().trim(), passHash, avatarLetters, id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(newParty);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create party:', err);
    res.status(500).json({ error: 'Database insert failed' });
  } finally {
    client.release();
  }
});

// Update a party
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, gstin, credit_limit, credit_days, address, phone } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE parties 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           gstin = $3,
           credit_limit = $4,
           credit_days = $5,
           address = $6
       WHERE id = $7 RETURNING *`,
      [name, type, gstin, credit_limit || null, credit_days || null, address, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// Delete a party
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM parties WHERE id = $1', [id]);
    res.json({ message: 'Party deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

export default router;
