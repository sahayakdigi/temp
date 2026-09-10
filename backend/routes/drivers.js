import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM drivers ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Create a driver
router.post('/', async (req, res) => {
  let { 
    id, name, licence_no, phone, status, otp_status, licence_exp,
    aadhaar_no, emergency_name, emergency_phone, blood_group, bgv_status, bank_acc_no, bank_ifsc, upi_id, pan_no, experience_years, preferred_routes, rating,
    aadhaar_doc_url, pan_doc_url, licence_doc_url
  } = req.body;
  const cleanLicenceExp = (licence_exp && licence_exp.trim() !== '') ? licence_exp : null;
  try {
    // Generate ID dynamically on the backend to avoid conflicts
    const countRes = await pool.query('SELECT COUNT(*) FROM drivers');
    const nextNum = parseInt(countRes.rows[0].count) + 1;
    
    let exists = true;
    let tempNum = nextNum;
    let finalId = `DRV-0${tempNum}`;
    
    while (exists) {
      finalId = `DRV-0${tempNum}`;
      const checkRes = await pool.query('SELECT 1 FROM drivers WHERE id = $1', [finalId]);
      if (checkRes.rows.length === 0) {
        exists = false;
      } else {
        tempNum++;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO drivers (
        id, name, licence_no, phone, status, otp_status, licence_exp,
        aadhaar_no, emergency_name, emergency_phone, blood_group, bgv_status, bank_acc_no, bank_ifsc, upi_id, pan_no, experience_years, preferred_routes, rating,
        aadhaar_doc_url, pan_doc_url, licence_doc_url
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *`,
      [
        finalId, name, licence_no, phone, status || 'Active', otp_status || 'Pending', cleanLicenceExp,
        aadhaar_no || '', emergency_name || '', emergency_phone || '', blood_group || '', bgv_status || 'Pending', bank_acc_no || '', bank_ifsc || '', upi_id || '', pan_no || '', Number(experience_years) || 0, preferred_routes || '', Number(rating) || 5.0,
        aadhaar_doc_url || '', pan_doc_url || '', licence_doc_url || ''
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Database insert failed' });
  }
});

// Update driver status/verification
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No update fields provided' });
  }

  const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = [...Object.values(updates), id];

  try {
    const { rows } = await pool.query(
      `UPDATE drivers SET ${fields} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

export default router;
