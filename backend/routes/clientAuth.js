import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();
const SALT_ROUNDS = 10;

// Client self-registration
router.post('/register-client', async (req, res) => {
  const { companyName, gstin, email, password, phone, address } = req.body;

  if (!companyName || !gstin || !email || !password) {
    return res.status(400).json({ error: 'Company Name, GSTIN, Email, and Password are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if email is already registered
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // 2. Generate a unique Party ID
    const randomNum = Math.floor(Math.random() * 90000 + 10000);
    const partyId = `PAR-${randomNum}`;

    // 3. Create the Party record
    const partyRes = await client.query(
      `INSERT INTO parties (id, name, type, gstin, credit_limit, credit_days, address)
       VALUES ($1, $2, 'client', $3, 100000, 30, $4)
       RETURNING *`,
      [partyId, companyName.trim(), gstin.trim().toUpperCase(), address || null]
    );

    const newParty = partyRes.rows[0];

    // 4. Create the User record (mapped to the party)
    const passHash = await bcrypt.hash(password, SALT_ROUNDS);
    const avatarLetters = companyName.substring(0, 2).toUpperCase();

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, branch, branch_label, avatar, designation, phone, party_id)
       VALUES ($1, $2, $3, 'Client', 'HO', 'Client Portal', $4, 'Client Admin', $5, $6)
       RETURNING id, name, email, role, branch, branch_label, avatar, designation, phone, party_id`,
      [
        `${companyName.trim()} Admin`,
        email.toLowerCase().trim(),
        passHash,
        avatarLetters,
        phone || null,
        partyId
      ]
    );

    const newUser = userRes.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Registration successful',
      user: {
        ...newUser,
        branchLabel: newUser.branch_label,
        partyId: newUser.party_id
      },
      party: newParty
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Client registration failed:', err);
    res.status(500).json({ error: 'Database transaction failed during registration.' });
  } finally {
    client.release();
  }
});

export default router;
