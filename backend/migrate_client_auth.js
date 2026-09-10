import pool from './db.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function migrate() {
  console.log('⏰ Starting Client Auth database migration...');
  try {
    // 1. Add party_id column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS party_id VARCHAR;
    `);
    console.log('  ✓ Column party_id added to users table');

    // 2. Create Ankit Sports party in parties table if not exists
    await pool.query(`
      INSERT INTO parties (id, name, type, gstin, credit_limit, credit_days, address)
      VALUES (
        'PAR-05', 
        'Ankit Sports', 
        'client', 
        '06ANKIT1234F1ZE', 
        300000, 
        30, 
        'Plot 45, Sector 18, Gurugram, Haryana'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        gstin = EXCLUDED.gstin,
        address = EXCLUDED.address;
    `);
    console.log('  ✓ Party Ankit Sports (PAR-05) created');

    // 3. Create or update user account for Ankit Sports in users table
    const passHash = await bcrypt.hash('client123', SALT_ROUNDS);
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role, branch, branch_label, avatar, designation, phone, party_id)
      VALUES (
        'Ankit Sports Manager',
        'ankit@sports.in',
        $1,
        'Client',
        'HO',
        'Client Portal',
        'AS',
        'Client Admin',
        '+91 99999 88888',
        'PAR-05'
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        party_id = EXCLUDED.party_id,
        phone = EXCLUDED.phone;
    `, [passHash]);
    console.log('  ✓ User ankit@sports.in created and linked to PAR-05');

    // 4. Link existing client@relianceretail.in user to PAR-01
    await pool.query(`
      UPDATE users 
      SET party_id = 'PAR-01' 
      WHERE email = 'client@relianceretail.in';
    `);
    console.log('  ✓ Linked client@relianceretail.in to PAR-01');

    console.log('🎉 Client Auth database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
