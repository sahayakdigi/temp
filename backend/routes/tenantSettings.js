import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get tenant settings
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM tenant_settings WHERE tenant_id = 'default_tenant'"
    );
    if (rows.length === 0) {
      // Fallback in case it wasn't seeded
      return res.json({
        tenant_id: 'default_tenant',
        company_name: 'Chetak Roadways Pvt Ltd',
        brand_name: 'Chetak Roadways',
        gstin: '06AAABC1234D1ZE',
        pan: 'AAABC1234D',
        registered_address: 'Plot 14, Industrial Area, Gurgaon - 122001, Haryana',
        primary_contact_name: 'Pradeep Kumar',
        primary_phone: '+91 98765 43210',
        support_email: 'support@chetakroad.com',
        website: 'https://yourcompany.com',
        logo_url: ''
      });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Update/create tenant settings
router.post('/', async (req, res) => {
  const {
    company_name,
    brand_name,
    gstin,
    pan,
    registered_address,
    primary_contact_name,
    primary_phone,
    support_email,
    website,
    logo_url
  } = req.body;

  if (!company_name || !gstin) {
    return res.status(400).json({ error: 'Company Name and GSTIN are required fields' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tenant_settings (
        tenant_id, company_name, brand_name, gstin, pan, registered_address,
        primary_contact_name, primary_phone, support_email, website, logo_url, updated_at
      ) VALUES ('default_tenant', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        brand_name = EXCLUDED.brand_name,
        gstin = EXCLUDED.gstin,
        pan = EXCLUDED.pan,
        registered_address = EXCLUDED.registered_address,
        primary_contact_name = EXCLUDED.primary_contact_name,
        primary_phone = EXCLUDED.primary_phone,
        support_email = EXCLUDED.support_email,
        website = EXCLUDED.website,
        logo_url = EXCLUDED.logo_url,
        updated_at = NOW()
      RETURNING *`,
      [
        company_name,
        brand_name,
        gstin,
        pan,
        registered_address,
        primary_contact_name,
        primary_phone,
        support_email,
        website,
        logo_url || ''
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

export default router;
